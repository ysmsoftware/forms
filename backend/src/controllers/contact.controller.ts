import { Request, NextFunction, Response } from "express";
import { ContactService } from "../services/contact.service";
import { BadRequestError } from "../errors/http-errors";


export class ContactController {

    constructor( private contactService: ContactService) { }


    create = async (req: Request, res: Response, next:NextFunction) => {
        try {
            const { name, email, phone } = req.body;

            if(!email && !phone) {
                throw new BadRequestError('Email or phone required');
            }

            const result = await this.contactService.createContact({ name, email, phone });

            return res.status(201).json({
                success: true,
                data: result
            });
            
        } catch (error) {
            next(error)
        }       
    }

    update = async (req: Request, res: Response, next:NextFunction) => {
        try {
            const id = req.params.id as string;
            const { name, email, phone } = req.body;

            const result = await this.contactService.updateContact(id, { name, email, phone, })

            return res.json({
                success: true,
                data: result
            });

        } catch (error) {
            next(error)
        }       
    }

    delete = async (req: Request, res: Response, next:NextFunction) => {
        try {
           
            const id = req.params.id as string;

            await this.contactService.deleteContact(id);

            return res.json({
                success: true,
                message: "Contact deleted"
            });

        } catch (error) {
            next(error)
        }       
    }

    restore = async (req: Request, res: Response, next:NextFunction) => {
        try {
        
            const id = req.params.id as string;

            await this.contactService.restoreContact(id);

            return res.json({
                success: true,
                message: "Contact restored"
            });

        } catch (error) {
            next(error)
        }       
    }

    list = async (req: Request, res: Response, next:NextFunction) => {
        try {
            
            const search = req.query.search as string;
            const lastId = req.query.lastId as string;
            const take = req.query.take ? Number(req.query.take) : 20;

            const result = await this.contactService.listContacts({
                search, 
                lastId,
                take
            });

            return res.json({
                success: true,
                data: {
                    contacts: result.contacts,
                    total: result.total
                }
            });

        } catch (error) {
            next(error)
        }       
    }

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await this.contactService.getContactById(id);
            return res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    getEvents = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            
            const result = await this.contactService.getContactEventIds(id);

            return res.json({
                success: true,
                data: result
            })

        } catch (error) {
            next(error);
        }
    }
}