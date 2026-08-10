export { sendMail, type Mail, type SendResult } from './transport'
export {
  orderConfirmationMail,
  bookingConfirmationMail,
  type MailLine,
  type OrderMailInput,
  type BookingMailInput,
} from './templates'
export {
  enquiryReceivedMail,
  enquiryForShopMail,
  INTENT_LABEL,
  NEXT_STEP,
  type EnquiryMailInput,
} from './enquiry'
