
// DI wiring
import { PaymentController } from "./controllers/payment.controller";
import { RazorpayProvider } from "./providers/razorpay.provider";
import { EventRepository } from "./repositories/event.repo";
import { ContactRepository } from "./repositories/contact.repo";
import { MessageRepository } from "./repositories/message.repo";
import { PaymentRepository } from "./repositories/payment.repo";
import { SubmissionsRepository } from "./repositories/submission.repo";
import { PaymentService } from "./services/payment.service";
import { AnalyticsRepository } from "./repositories/analytics.repo";
import { CertificateRepository } from "./repositories/certificate.repo";
import { FileRepository } from "./repositories/file.repo";
import { FormRepositories } from "./repositories/form.repo";
import { UserRepository } from "./repositories/user.repo";
import { AnalyticsService } from "./services/analytics.service";
import { AuthService } from "./services/auth.service";
import { CertificateService } from "./services/certificate.service";
import { EventService } from "./services/event.service";
import { FileService } from "./services/file.service";
import { FileStorageProvider, getStorageProvider } from './providers/storage.provider';
import { FormService } from "./services/form.service";
import { MessageService } from "./services/message.service";
import { SubmissionService } from "./services/submissions.service";
import { AnalyticsController } from "./controllers/analytics.controller";
import { AuthController } from "./controllers/auth.controller";
import { CertificateController } from "./controllers/certificate.controller";
import { EventController } from "./controllers/event.controller";
import { FileController } from "./controllers/file.controller";
import { FormController } from "./controllers/form.controller";
import { MessageController } from "./controllers/message.controller";
import { SubmissionController } from "./controllers/submission.controller";
import { TagRepository } from "./repositories/tag.repo";
import { ContactService } from "./services/contact.service";
import { TagService } from "./services/tag.service";
import { ContactController } from "./controllers/contact.controller";
import { TagController } from "./controllers/tag.controller";


// Repositories
const analyticsRepo = new AnalyticsRepository();
const certificateRepo = new CertificateRepository();
const contactRepo = new ContactRepository();
const eventRepo = new EventRepository();
const fileRepo = new FileRepository();
const formRepo = new FormRepositories();
const messageRepo = new MessageRepository();
const paymentRepo = new PaymentRepository();
const submissionRepo = new SubmissionsRepository();
const tagRepo = new TagRepository();
const userRepo = new UserRepository();

// Providers
const Razorpay = new RazorpayProvider()
const storage = getStorageProvider();

// Services
const analyticsService = new AnalyticsService(analyticsRepo, eventRepo);
const authService = new AuthService(userRepo);
const eventService = new EventService(eventRepo);
const certificateService = new CertificateService(certificateRepo, submissionRepo, eventService, contactRepo);
const contactService = new ContactService(contactRepo, eventRepo, certificateRepo, paymentRepo, messageRepo, tagRepo, fileRepo);
const fileService = new FileService(fileRepo, storage);
const formService = new FormService(formRepo, eventRepo);
const messageService = new MessageService(messageRepo, contactRepo, eventRepo);
const paymentService = new PaymentService(paymentRepo, eventRepo, submissionRepo, Razorpay, messageService);
const submissionsService = new SubmissionService(submissionRepo, formRepo, eventRepo, contactRepo, fileRepo);
const tagService = new TagService(tagRepo, contactRepo);


// Controllers
export const analyticsController = new AnalyticsController(analyticsService);
export const authController = new AuthController(authService);
export const certificateController = new CertificateController(certificateService);
export const contactController = new ContactController(contactService);
export const eventController = new EventController(eventService);
export const fileController = new FileController(fileService);
export const formController = new FormController(formService);
export const messageController = new MessageController(messageService);
export const paymentController = new PaymentController(paymentService);
export const submissionController = new SubmissionController(submissionsService);
export const tagController = new TagController(tagService);
