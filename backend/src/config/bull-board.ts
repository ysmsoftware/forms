import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { certificateQueue } from '../queues/certificate.queue';
import { messageQueue } from '../queues/message.queue';

// Create the Express adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues'); // Dashboard will be at /admin/queues

// Create Bull Board
const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [
    new BullMQAdapter(certificateQueue),
    new BullMQAdapter(messageQueue), 
    // Add more queues here as you create them
  ],
  serverAdapter: serverAdapter,
});

export { serverAdapter, addQueue, removeQueue, setQueues, replaceQueues };