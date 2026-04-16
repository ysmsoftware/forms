import { Request, NextFunction, Response } from "express";
import { ContactService } from "../services/contact.service";
import { BadRequestError } from "../errors/http-errors";

export class ContactController {

    constructor( private contactService: ContactService) { }


    create = async (req: Request, res: Response, next:NextFunction) => {
        try {
            const { name, email, phone } = req.body;

            if(!email && !phone) {
                throw new BadRequestError('name, Email or phone required to create a contact');
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
            
            if (!name && !email && !phone) {
                throw new BadRequestError("At least one field required to update");
            }

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
            const contactId = req.params.id as string;
            if (!contactId) {
                throw new BadRequestError("contactId is required");
            }
            const result = await this.contactService.getContactById(contactId);

            return res.json({ success: true, data: result });

        } catch (error) {
            next(error);
        }
    }

    getEvents = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const contactId = req.params.id as string;
        
            const result = await this.contactService.getContactEvents(contactId);

            return res.json({
                success: true,
                data: result
            })

        } catch (error) {
            next(error);
        }
    }

    getCertificates = async (req: Request, res: Response, next: NextFunction) => {
        try{
            const contactId = req.params.id as string;

            const result = await this.contactService.getContactCertificates(contactId);

            return res.json({
                success: true,
                data: result
            });

        } catch(error) {
            next(error)
        }
    }

    getPayments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const contactId = req.params.id as string
            
            const limit  = parseInt(req.query.limit as string) || 20;
            const cursor = req.query.cursor as string;
            const status = req.query.status as string;

            const result = await this.contactService.getContactPayments(contactId, { limit, cursor, status });

            return res.json({
                success: true,
                data: result
            });

        } catch(error) {
            next(error);
        }
    } 

    getMessages  = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const contactId = req.params.id as string
            const limit  = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const result = await this.contactService.getContactMessages(contactId, { limit, offset, });

            return res.json({
                success: true,
                data: result
            });

        } catch(error) {
            next(error);
        }
    } 

    getTags = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const contactId = req.params.id as string
            
            const result = await this.contactService.getContactTags(contactId);

            return res.json({
                success: true,
                data: result
            })
        } catch(error) {
            next(error);
        }
    } 

    getFiles = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const contactId = req.params.id as string

            const result = await this.contactService.getContactFiles(contactId);
            
            return res.json({
                success: true,
                data: result
            })
        } catch(error) {
            next(error);
        }
    } 
}