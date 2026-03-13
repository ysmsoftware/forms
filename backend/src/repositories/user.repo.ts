import { User, Role } from "@prisma/client";
import { prisma, } from "../config/db";
import logger from "../config/logger";

export interface IUserRepository {

    createUser(data: {
        name: string,
        email: string;
        passwordHash: string;
        role?: Role
    }): Promise<User>;

    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
}

export class UserRepository implements IUserRepository {

    async createUser(data: {
        name: string; email:string; passwordHash: string; role?: Role;
    }): Promise<User> {
        
        return prisma.user.create({ data, })
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
