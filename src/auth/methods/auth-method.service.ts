import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common'
import {PrismaService} from "../../prisma/prisma.service";

@Injectable()
export class AuthMethodsService {
    constructor(private prisma: PrismaService) {}

    async getMethods(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                passwordHash: true,
                providers: { select: { provider: true } },
            },
        })
        if (!user) throw new NotFoundException()

        return {
            hasPassword: !!user.passwordHash,
            providers: user.providers.map(p => p.provider),
        }
    }

    async assertCanRemoveAuthMethod(userId: string, remove: 'password' | 'provider') {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                passwordHash: true,
                _count: { select: { providers: true } },
            },
        })

        if (!user) throw new NotFoundException()

        const hasPassword = !!user.passwordHash
        const providersCount = user._count.providers

        const remainingMethods =
            (hasPassword ? 1 : 0) +
            providersCount -
            (remove === 'password' ? 1 : 0) -
            (remove === 'provider' ? 1 : 0)

        if (remainingMethods <= 0) {
            throw new BadRequestException('Cannot remove last auth method')
        }
    }
}