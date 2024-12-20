import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto, SigninDto } from './dto';
import { Tokens } from './types';

import { AuthJwt } from './abstract/auth-jwt';
import { UpdateHashException, HashingException } from '../exceptions';

@Injectable()
export class AuthService extends AuthJwt {
  constructor(
    public prismaService: PrismaService,
    public jwtService: JwtService,
  ) {
    super(jwtService, prismaService);
  }

  async signup(dto: AuthDto): Promise<Tokens> {
    try {
      if (await this.validateEmailExist(dto.email))
        new ConflictException('A user with this email already exists.');
      const hash = await this.hash(dto.password);
      const created = await this.prismaService.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hash,
          role_id: 2,
        },
      });

      const tokens = await this.getToken(
        created.id,
        created.email,
        created.role_id,
      );
      await this.updatedRtHash(created.id, tokens.refresh_token);

      return tokens;
    } catch (error) {
      const allowedExceptions = [
        UnauthorizedException,
        UpdateHashException,
        ConflictException,
        HashingException,
      ];

      if (allowedExceptions.some((exception) => error instanceof exception)) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async signing(dto: SigninDto): Promise<Tokens> {
    try {
      if (!(await this.validateEmailExist(dto.email)))
        new UnauthorizedException(
          'Authentication failed. Please check your credentials.',
        );

      const user = await this.findUserEmail(dto.email);

      await this.compareUserPassword(dto.password, user.password);

      const tokens = await this.getToken(user.id, user.email, user.role_id);

      await this.updatedRtHash(user.id, tokens.refresh_token);

      return tokens;
    } catch (error) {
      const allowedExceptions = [UnauthorizedException, ForbiddenException];

      if (allowedExceptions.some((exception) => error instanceof exception)) {
        throw error;
      }

      throw new HttpException(
        'An unexpected error occurred. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async validateEmailExist(email: string): Promise<boolean> {
    try {
      const find = await this.prismaService.user.findFirst({
        where: {
          email,
        },
      });
      return !!find;
    } catch (error) {
      throw new HttpException(
        'An unexpected error occurred. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
