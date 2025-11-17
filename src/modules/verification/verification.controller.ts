import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RequestPhoneVerificationDto } from './dto/request-phone-verification.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import {
  UploadIdDocumentDto,
  DocumentType,
} from './dto/upload-id-document.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';
// import { Roles } from 'src/core/decorators/roles.decorator';
// import { RolesGuard } from 'src/core/guards/roles.guard';

@ApiTags('verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('email/request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Demander un email de vérification' })
  requestEmailVerification(@Request() req) {
    return this.verificationService.sendEmailVerification(req.user.id);
  }

  @Post('email/verify')
  @ApiOperation({ summary: "Vérifier l'adresse email avec un token" })
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.verificationService.verifyEmail(verifyEmailDto.token);
  }

  @Post('phone/request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Demander un code de vérification par SMS' })
  requestPhoneVerification(
    @Request() req,
    @Body() requestPhoneVerificationDto: RequestPhoneVerificationDto,
  ) {
    return this.verificationService.requestPhoneVerification(
      req.user.id,
      requestPhoneVerificationDto.phone,
    );
  }

  @Post('phone/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vérifier le numéro de téléphone avec un code' })
  verifyPhone(@Request() req, @Body() verifyPhoneDto: VerifyPhoneDto) {
    return this.verificationService.verifyPhone(
      req.user.id,
      verifyPhoneDto.code,
    );
  }

  @Post('document/upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        documentType: {
          enum: Object.values(DocumentType),
        },
        notes: {
          type: 'string',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Télécharger un document de vérification' })
  uploadIdDocument(
    @Request() req,
    @Body() uploadIdDocumentDto: UploadIdDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Fichier requis');
    }

    return this.verificationService.uploadIdDocument(
      req.user.id,
      uploadIdDocumentDto.documentType,
      file.buffer,
      file.mimetype,
      uploadIdDocumentDto.notes,
    );
  }

  @Patch('identity/approve/:userId')
  @UseGuards(JwtAuthGuard)
  // @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Approuver la vérification d'identité (admin)" })
  approveIdVerification(@Param('userId') userId: string, @Request() req) {
    return this.verificationService.approveIdVerification(userId, req.user.id);
  }

  @Patch('advanced/approve/:userId')
  @UseGuards(JwtAuthGuard)
  // @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approuver la vérification avancée (admin)' })
  approveAdvancedVerification(@Param('userId') userId: string, @Request() req) {
    return this.verificationService.approveAdvancedVerification(
      userId,
      req.user.id,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir les informations de vérification' })
  getVerificationInfo(@Request() req) {
    return this.verificationService.getVerificationInfo(req.user.id);
  }
}
