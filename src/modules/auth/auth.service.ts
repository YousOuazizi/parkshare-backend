import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { User, VerificationLevel } from '../users/entities/user.entity';
import { VerificationService } from '../verification/verification.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private verificationService: VerificationService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, refreshToken, ...result } = user;
      return result;
    }

    return null;
  }

  async login(user: any) {
    const tokens = await this.getTokens(
      user.id,
      user.email,
      user.role,
      user.verificationLevel,
    );
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);

    // Récupérer les informations de vérification pour les inclure dans la réponse
    const verificationInfo = await this.verificationService.getVerificationInfo(
      user.id,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        verificationLevel: user.verificationLevel,
        verificationStatus: {
          currentLevel: user.verificationLevel,
          emailVerified: user.verified,
          phoneVerified: user.phoneVerified || false,
          idVerified: user.idVerified || false,
          advancedVerified: user.advancedVerified || false,
        },
      },
      verification: {
        nextSteps: verificationInfo.nextSteps,
        levelRequirements: await this.getLevelRequirements(),
      },
      ...tokens,
    };
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);

    const tokens = await this.getTokens(
      user.id,
      user.email,
      user.role,
      user.verificationLevel,
    );
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);

    // Envoyer automatiquement un email de vérification
    await this.verificationService.sendEmailVerification(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        verificationLevel: user.verificationLevel,
      },
      verification: {
        nextSteps: [
          'Vérifiez votre adresse email pour débloquer plus de fonctionnalités',
        ],
        levelRequirements: await this.getLevelRequirements(),
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findOne(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Accès refusé');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Accès refusé');
    }

    const tokens = await this.getTokens(
      user.id,
      user.email,
      user.role,
      user.verificationLevel,
    );
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.setRefreshToken(userId, null);
    return { message: 'Déconnexion réussie' };
  }

  async getTokens(
    userId: string,
    email: string,
    role: string,
    verificationLevel: number,
  ) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
          verificationLevel,
        },
        {
          secret: this.configService.get<string>('jwt.secret'),
          expiresIn: this.configService.get<string>('jwt.expiresIn'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
          verificationLevel,
        },
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  // Méthode utilitaire pour obtenir les exigences de chaque niveau
  private async getLevelRequirements() {
    return [
      {
        level: VerificationLevel.LEVEL_1,
        name: 'Email vérifié',
        features: [
          'Navigation de base',
          'Recherche de parkings',
          'Consultation des détails',
        ],
        unlocks: "Accès basique à l'application",
      },
      {
        level: VerificationLevel.LEVEL_2,
        name: 'Téléphone vérifié',
        features: [
          'Réservation de parkings',
          "Paiements jusqu'à 200€",
          'Maximum 2 réservations actives',
        ],
        unlocks: 'Réservation avec limites',
      },
      {
        level: VerificationLevel.LEVEL_3,
        name: 'Identité vérifiée',
        features: [
          'Publication de parkings',
          "Paiements jusqu'à 1000€",
          'Maximum 5 réservations actives',
          'Maximum 3 parkings publiés',
        ],
        unlocks: 'Publication et paiements importants',
      },
      {
        level: VerificationLevel.LEVEL_4,
        name: 'Vérification avancée',
        features: [
          'Paiements sans limite',
          'Réservations illimitées',
          'Parkings illimités',
          'Accès aux fonctionnalités premium',
        ],
        unlocks: 'Accès complet sans restrictions',
      },
    ];
  }
}
