import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {

    constructor(private readonly prismaService: PrismaService) { }

    async signup() { }
    async signin() { }
    async logout() { }
    async refreshToken() { }


}
