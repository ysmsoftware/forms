import { User, Role } from "@prisma/client";
import { prisma, } from "../config/db";
import logger from "../config/logger";

export interface IUserRepository {

    createUserWithOrg(data: {
        name: string;
        email: string;
        passwordHash: string;
    }): Promise<{ user: User; organizationId: string }>;


    createUser(data: {
        organizationId: string,
        name: string,
        email: string;
        passwordHash: string;
        role?: Role
    }): Promise<User>;


    findOrgMembership(userId: string): Promise<{ organizationId: string } | null>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
}

export class UserRepository implements IUserRepository {

    async createUserWithOrg(data: {
        name: string;
        email: string;
        passwordHash: string;
    }): Promise<{ user: User; organizationId: string }> {

        return prisma.$transaction(async (tx) => {

            const user = await tx.user.create({
                data: {
                    name: data.name,
                    email: data.email,
                    passwordHash: data.passwordHash
                },
            });

            const baseSlug = data.name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9-]+/g, '-')
                .replace(/^-|-$/g, '');

            const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

            const org = await tx.organization.create({
                data: {
                    name: `${data.name}'s Organization`,
                    slug,
                },
            });

            await tx.organizationMember.create({
                data: {
                    userId: user.id,
                    organizationId: org.id,
                    role: 'OWNER',
                },
            });


            return { user, organizationId: org.id }

        })
    }

    async createUser(data: {
        organizationId: string, name: string; email: string; passwordHash: string; role?: Role;
    }): Promise<User> {

        return prisma.user.create({ data, })
    }

    async findOrgMembership(userId: string): Promise<{ organizationId: string } | null> {
        const member = await prisma.organizationMember.findFirst({
            where: { userId, isActive: true },
            select: { organizationId: true }
        })
        return member ?? null;
    }


    async findByEmail(email: string): Promise<User | null> {
        logger.info(`[Repo] Signup request received for email: ${email}`);
        return prisma.user.findUnique({
            where: { email },
        });
    }

    async findById(id: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { id },
        });
    }
}
