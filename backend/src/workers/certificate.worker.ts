import { Worker } from 'bullmq'
import { CertificateWorkerService } from './certificate.worker.service';
import { workerRegistry } from './worker.registry';
import { FileService } from '../services/file.service';
import { CertificateRepository } from '../repositories/certificate.repo';
import { CertificateGeneratorService } from '../services/certificate-generator.service';
import { FileRepository } from '../repositories/file.repo';
import {  getStorageProvider } from './../providers/storage.provider';
import logger from '../config/logger';
import { redis } from '../config/redis';

export class CertifcateWorker {

    name = "certificate-worker";

    constructor(
        private workerService: CertificateWorkerService
    ) {}


    start() {
        const worker = new Worker(
            "certificate-queue", 
            async (job) => {
                logger.info(`Processing certificate job ${job.id}`, {certificateId: job.data.certificateId });
                try {
                    await this.workerService.generate(job.data);
                    logger.info(`Certificate job ${job.id} completed`);
                } catch (error) {
                    logger.error(`Certificate job ${job.id} failed`, error);
                    throw error;
                }
            },
            {
                connection: redis,
                concurrency: 3
            }
        );

        worker.on('completed', (job) => {
            logger.info(`Certificate generated`, {jobId: job.id, certificateId: job.data.certificateId });
        });

        worker.on('failed', (job, err) => {
            logger.error(`Certificate generation failed`, {
                jobId: job?.id,
                certficateId: job?.data?.certificateId,
                error: err.message
            });
        });

        logger.info('Certificate worker started (BullMQ processor)');
    }
}


const storageProvider = getStorageProvider();
const certificateRepo = new CertificateRepository();
const fileService = new FileService(new FileRepository(), storageProvider);
const workerService  =  new CertificateWorkerService(certificateRepo, fileService, new CertificateGeneratorService());
const certifcateWorker = new CertifcateWorker(workerService);

workerRegistry.register(certifcateWorker)