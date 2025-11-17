import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../modules/users/entities/user.entity';
import { UsersService } from '../modules/users/users.service';

@WebSocketGateway({
  cors: {
    origin: '*', // A ajuster en production
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Authentifier le client avec JWT
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      if (!payload) {
        client.disconnect();
        return;
      }

      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        client.disconnect();
        return;
      }

      // Stocker l'association utilisateur-socket
      this.connectedClients.set(user.id, client.id);

      // Ajouter l'utilisateur à une room personnelle
      client.join(`user:${user.id}`);

      console.log(`Client connected: ${user.id}`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Nettoyer les associations lors de la déconnexion
    const userId = this.getUserIdFromSocketId(client.id);
    if (userId) {
      this.connectedClients.delete(userId);
      console.log(`Client disconnected: ${userId}`);
    }
  }

  // Méthode utilitaire pour trouver l'ID utilisateur à partir de l'ID socket
  private getUserIdFromSocketId(socketId: string): string | undefined {
    for (const [userId, sId] of this.connectedClients.entries()) {
      if (sId === socketId) {
        return userId;
      }
    }
    return undefined;
  }

  // Envoyer une notification à un utilisateur spécifique
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  // Envoyer une mise à jour de réservation
  sendBookingUpdate(userId: string, bookingId: string, status: string) {
    this.server
      .to(`user:${userId}`)
      .emit('booking_update', { bookingId, status });
  }

  // Envoyer une mise à jour de parking (disponibilité, etc.)
  sendParkingUpdate(parkingId: string, data: any) {
    this.server.emit('parking_update', { parkingId, ...data });
  }

  // Message de chat
  @SubscribeMessage('send_message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { recipientId: string; content: string; bookingId?: string },
  ) {
    const senderId = this.getUserIdFromSocketId(client.id);

    if (!senderId) {
      return { success: false, message: 'Unauthorized' };
    }

    // Transmettre le message au destinataire
    this.server.to(`user:${data.recipientId}`).emit('receive_message', {
      senderId,
      content: data.content,
      bookingId: data.bookingId,
      timestamp: new Date(),
    });

    return { success: true };
  }
}
