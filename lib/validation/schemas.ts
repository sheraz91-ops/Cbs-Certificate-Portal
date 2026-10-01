import { z } from "zod";

const requiredText = (label: string, max = 200) => z.string().trim().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`);

export const userProfileSchema = z.object({
  emailAddress: z.string().trim().email("Enter a valid email address").max(254).transform((value) => value.toLowerCase()),
  fullName: requiredText("Full name", 160),
  registrationNumber: requiredText("Registration number", 80),
  department: requiredText("Department", 120),
  semester: requiredText("Semester", 40),
  section: requiredText("Section", 40),
  institute: requiredText("Institute", 160),
  whatsappNumber: requiredText("WhatsApp number", 32).regex(/^[+()\d .-]+$/, "Enter a valid WhatsApp number").refine((value) => {
    const digits = value.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 15;
  }, "WhatsApp number must contain 7 to 15 digits"),
  cnic: requiredText("CNIC", 15).regex(/^(?:\d{13}|\d{5}-\d{7}-\d)$/, "CNIC must contain 13 digits, optionally formatted as 12345-1234567-1"),
}).strict();

const ratio = z.number().finite().min(0).max(1);
export const layoutRatioSchema = ratio;
export const layoutPercentSchema = z.number().finite().min(0).max(100);
const boxSchema = z.object({
  leftRatio: ratio,
  rightRatio: ratio,
  topRatio: ratio,
  bottomRatio: ratio,
}).strict().refine((box) => box.leftRatio < box.rightRatio && box.topRatio < box.bottomRatio, "Box coordinates must have positive width and height");

export const layoutConfigSchema = z.object({
  nameField: z.object({
    centerXRatio: ratio,
    centerYRatio: ratio,
    maskBox: boxSchema,
    font: requiredText("Name font", 100),
    color: requiredText("Name color", 40),
    maxFontSize: z.number().finite().positive().max(500),
    minFontSize: z.number().finite().positive().max(500),
    maxWidthRatio: ratio,
  }).strict().refine((field) => field.minFontSize <= field.maxFontSize, "Name minimum font size cannot exceed its maximum"),
  idField: z.object({
    startXRatio: ratio,
    centerYRatio: ratio,
    maskBox: boxSchema,
    font: requiredText("ID font", 100),
    color: requiredText("ID color", 40),
    label: requiredText("ID label", 100),
    maxFontSize: z.number().finite().positive().max(500),
    minFontSize: z.number().finite().positive().max(500),
    maxWidthRatio: ratio,
  }).strict().refine((field) => field.minFontSize <= field.maxFontSize, "ID minimum font size cannot exceed its maximum"),
  qrField: z.object({
    box: boxSchema,
    caption: z.string().max(200),
    captionCenterXRatio: ratio,
    captionCenterYRatio: ratio,
    captionFontSize: z.number().finite().positive().max(500),
    captionColor: requiredText("QR caption color", 40),
  }).strict(),
  maskColor: requiredText("Mask color", 40),
}).strict();

export const createWorkshopSchema = z.object({
  key: requiredText("Workshop key", 80).toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Workshop key must use lowercase letters, numbers, and single hyphens"),
  workshopName: requiredText("Workshop name", 160),
  workshopFullTitle: requiredText("Workshop full title", 240),
  workshopCode: requiredText("Workshop code", 32).toUpperCase().regex(/^[A-Z0-9]+$/, "Workshop code must use letters and numbers only"),
  eventYear: z.string().trim().regex(/^\d{4}$/, "Event year must be a four-digit year"),
  eventDate: requiredText("Event date", 100),
  imageBase64: z.string().max(20 * 1024 * 1024, "Template image is too large").regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/, "Template image must be valid base64").optional(),
  imageExt: z.string().trim().toLowerCase().pipe(z.enum(["png", "jpg", "jpeg"])).optional(),
  layout: layoutConfigSchema.optional(),
}).strict().refine((value) => !value.imageBase64 || value.imageExt, {
  message: "A template image extension is required when uploading an image",
  path: ["imageExt"],
});

export const templateFileMetadataSchema = z.object({
  type: z.enum(["image/png", "image/jpeg"], { error: "Choose a PNG or JPEG template image" }),
  size: z.number().positive("Choose an image file").max(15 * 1024 * 1024, "Template image must be 15 MB or smaller"),
});

export const userIdSchema = z.string().trim().toUpperCase().regex(/^CBSU-\d{6,}$/, "Enter a valid assigned user ID");
export const workshopKeySchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Enter a valid workshop key");

export const userDetailsSchema = z.object({ userId: userIdSchema }).strict();
export const workshopKeyBodySchema = z.object({ workshop: workshopKeySchema }).strict();
export const participantDeleteSchema = z.object({
  workshop: workshopKeySchema,
  id: z.string().trim().min(1).max(32),
  name: requiredText("Participant name", 160),
}).strict();
export const addParticipantsSchema = z.object({
  workshop: workshopKeySchema,
  userIds: z.array(userIdSchema).min(1, "Enter at least one assigned user ID").max(500, "You can add at most 500 users at a time"),
}).strict().transform(({ workshop, userIds }) => ({ workshop, userIds: [...new Set(userIds)] }));

export const adminLoginSchema = z.object({ password: z.string().min(1, "Admin password is required").max(1024) }).strict();
export const certificateLookupSchema = z.object({
  id: z.string().trim().min(1, "A certificate ID is required").max(160, "Certificate ID is too long").regex(/^[A-Za-z0-9]+(?:[\s\-_/][A-Za-z0-9]+)*$/, "Certificate ID contains unsupported characters"),
  workshop: z.string().trim().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Enter a valid workshop key").optional().transform((value) => value || undefined),
}).strict();

export const apiEnvelopeSchema = z.object({
  Code: z.number().int().min(100).max(599),
  Content: z.unknown(),
  Count: z.number().int().nonnegative(),
  Message: z.string().min(1),
  Status: z.enum(["Success", "Error"]),
}).strict();

export const searchTextSchema = z.string().trim().max(120, "Search must be 120 characters or fewer");

export function validationMessage(error: z.ZodError): string {
  return error.issues.map((issue) => {
    const field = issue.path.length ? `${issue.path.join(".")}: ` : "";
    return `${field}${issue.message}`;
  }).join("; ");
}
