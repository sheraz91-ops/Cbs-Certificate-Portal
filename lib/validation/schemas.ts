import { z } from "zod";

const requiredText = (_label: string, max = 200) => z.string({ error: "Required" }).trim().min(1, "Required").max(max, `Must be ${max} characters or fewer`);

export const campusRegistrationNumberSchema = z.string({ error: "Required" }).trim().min(1, "Required").regex(/^\d{4}-uam-\d{4}$/i, "Invalid format").transform((value) => value.toLowerCase());
const semesterSchema = z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "Graduated"], { error: "Required" });
const sectionSchema = z.enum(["A", "B", "C", "D", "E", "F"], { error: "Required" });
const cnicSchema = z.string({ error: "Required" }).trim().min(1, "Required").regex(/^(?:\d{13}|\d{5}-\d{7}-\d)$/, "Invalid format").transform((value) => {
  const digits = value.replace(/\D/g, "");
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
});

export const userProfileSchema = z.object({
  emailAddress: z.string({ error: "Required" }).trim().min(1, "Required").email("Invalid format").max(254).transform((value) => value.toLowerCase()),
  fullName: requiredText("Full name", 160),
  registrationNumber: requiredText("Registration number", 80),
  department: requiredText("Department", 120),
  semester: semesterSchema,
  section: sectionSchema,
  institute: requiredText("Institute", 160),
  whatsappNumber: requiredText("WhatsApp number", 32).regex(/^[+()\d .-]+$/, "Invalid format").refine((value) => {
    const digits = value.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 15;
  }, "Invalid format"),
  cnic: cnicSchema,
}).strict();
export const campusUserProfileSchema = userProfileSchema.extend({ registrationNumber: campusRegistrationNumberSchema });

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

const registrationFieldSchema = z.object({
  _id: z.string().optional(),
  key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: requiredText("Field label", 100),
  type: z.enum(["text", "yes_no", "checkbox"]).default("text"),
  choices: z.array(requiredText("Choice", 100)).max(30).default([]),
  selectionMode: z.enum(["multiple", "single"]).default("multiple"),
  required: z.boolean(),
}).strict().transform(({ _id: _databaseId, ...field }) => field).superRefine((field, context) => {
  if (new Set(field.choices.map((choice) => choice.toLowerCase())).size !== field.choices.length) {
    context.addIssue({ code: "custom", message: "Choices must be unique", path: ["choices"] });
  }
  if (field.type !== "checkbox" && field.choices.length > 0) {
    context.addIssue({ code: "custom", message: "Choices are only available for checkbox fields", path: ["choices"] });
  }
});

export const createWorkshopSchema = z.object({
  key: requiredText("Event key", 80).toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid format"),
  workshopName: requiredText("Event name", 160),
  workshopFullTitle: requiredText("Event full title", 240),
  workshopCode: requiredText("Event code", 32).toUpperCase().regex(/^[A-Z0-9]+$/, "Invalid format"),
  eventYear: z.string({ error: "Required" }).trim().min(1, "Required").regex(/^\d{4}$/, "Invalid format"),
  eventDate: requiredText("Event date", 100),
  isActive: z.boolean({ error: "Required" }).default(true),
  isCompleted: z.boolean().default(false),
  allowOutsiders: z.boolean().default(false),
  registrationFields: z.array(registrationFieldSchema).max(30).default([]),
  imageBase64: z.string().max(20 * 1024 * 1024, "Template image is too large").regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/, "Template image must be valid base64").optional(),
  imageExt: z.string().trim().toLowerCase().pipe(z.enum(["png", "jpg", "jpeg"], { error: "Invalid format" })).optional(),
  layout: layoutConfigSchema.optional(),
}).strict().refine((value) => new Set(value.registrationFields.map((field) => field.key)).size === value.registrationFields.length, {
  message: "Custom registration fields must have unique identifiers",
  path: ["registrationFields"],
}).refine((value) => !value.imageBase64 || value.imageExt, {
  message: "Required",
  path: ["imageExt"],
});

export const templateFileMetadataSchema = z.object({
  type: z.enum(["image/png", "image/jpeg"], { error: "Choose a PNG or JPEG template image" }),
  size: z.number().positive("Choose an image file").max(15 * 1024 * 1024, "Template image must be 15 MB or smaller"),
});

export const userIdSchema = z.string({ error: "Required" }).trim().min(1, "Required").toUpperCase().regex(/^CBSU-\d{6,}$/, "Invalid format");
export const workshopKeySchema = z.string({ error: "Required" }).trim().min(1, "Required").toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid format");
export const updateWorkshopSchema = z.object({
  key: workshopKeySchema,
  workshopName: requiredText("Event name", 160),
  workshopFullTitle: requiredText("Event full title", 240),
  workshopCode: requiredText("Event code", 32).toUpperCase().regex(/^[A-Z0-9]+$/, "Invalid format"),
  eventYear: z.string({ error: "Required" }).trim().min(1, "Required").regex(/^\d{4}$/, "Invalid format"),
  eventDate: requiredText("Event date", 100),
  isActive: z.boolean({ error: "Required" }),
  isCompleted: z.boolean({ error: "Required" }),
  allowOutsiders: z.boolean({ error: "Required" }),
  registrationFields: z.array(registrationFieldSchema).max(30).default([]),
  imageBase64: z.string().max(20 * 1024 * 1024, "Template image is too large").regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/, "Template image must be valid base64").optional(),
  imageExt: z.string().trim().toLowerCase().pipe(z.enum(["png", "jpg", "jpeg"], { error: "Invalid format" })).optional(),
  layout: layoutConfigSchema.optional(),
}).strict().refine((value) => new Set(value.registrationFields.map((field) => field.key)).size === value.registrationFields.length, { message: "Custom registration fields must have unique identifiers", path: ["registrationFields"] }).refine((value) => !value.imageBase64 || (value.imageExt && value.layout), { message: "A template image type and layout are required", path: ["imageExt"] });
export const eventRegistrationSchema = userProfileSchema.extend({ workshop: workshopKeySchema, customFields: z.record(z.string(), z.string().max(4000)).default({}) });
export const adminUpdateUserSchema = userProfileSchema.extend({ userId: userIdSchema });
export const assignUserEventSchema = z.object({ userId: userIdSchema, workshop: workshopKeySchema }).strict();
export const organizerIdSchema = z.string({ error: "Required" }).trim().min(1, "Required").toUpperCase().regex(/^CBSO-\d{6,}$/, "Invalid format");
export const organizerCertificateIdentitySchema = z.object({
  organizerId: organizerIdSchema,
  fullName: requiredText("Full name", 160),
}).strict();
export const organizerCertificateGenerateSchema = organizerCertificateIdentitySchema.extend({ workshop: workshopKeySchema }).strict();
export const createOrganizerBaseSchema = campusUserProfileSchema.extend({
  password: z.string({ error: "Required" }).min(1, "Required").min(16, "Password must contain at least 16 characters").max(128),
  workshops: z.array(workshopKeySchema, { error: "Required" }).min(1, "Required").max(100),
});
export const createOrganizerSchema = createOrganizerBaseSchema.transform((value) => ({ ...value, workshops: [...new Set(value.workshops)] }));
export const organizerDetailsSchema = z.object({ organizerId: organizerIdSchema }).strict();
export const updateOrganizerSchema = campusUserProfileSchema.extend({
  organizerId: organizerIdSchema,
  workshops: z.array(workshopKeySchema, { error: "Required" }).max(100),
  password: z.string().max(128).refine((value) => value.length === 0 || value.length >= 16, "New password must contain at least 16 characters").optional(),
}).strict().transform((value) => ({ ...value, workshops: [...new Set(value.workshops)], password: value.password || undefined }));
export const organizerLoginSchema = z.object({
  email: z.string({ error: "Required" }).trim().min(1, "Required").email("Invalid format").max(254).transform((value) => value.toLowerCase()),
  password: z.string({ error: "Required" }).min(1, "Required").max(128),
}).strict();
export const organizerAssignmentSchema = z.object({
  organizerId: organizerIdSchema,
  workshops: z.array(workshopKeySchema, { error: "Required" }).max(100),
}).strict().transform((value) => ({ ...value, workshops: [...new Set(value.workshops)] }));
export const organizerAttendanceSchema = z.object({
  workshop: workshopKeySchema,
  participantId: z.string({ error: "Required" }).trim().min(1, "Required").max(32),
  present: z.boolean({ error: "Required" }),
}).strict();
export const adminAttendanceSchema = z.object({
  userId: userIdSchema,
  workshop: workshopKeySchema,
  participantId: z.string({ error: "Required" }).trim().min(1, "Required").max(32),
  present: z.boolean({ error: "Required" }),
}).strict();

export const userDetailsSchema = z.object({ userId: userIdSchema }).strict();
export const userStatusSchema = z.object({ userId: userIdSchema, isActive: z.boolean() }).strict();
export const userDeleteSchema = z.object({ userId: userIdSchema, password: z.string().min(1).max(1024) }).strict();
export const organizerStatusSchema = z.object({ organizerId: organizerIdSchema, isActive: z.boolean() }).strict();
export const organizerDeleteSchema = z.object({ organizerId: organizerIdSchema, password: z.string().min(1).max(1024) }).strict();
export const workshopKeyBodySchema = z.object({ workshop: workshopKeySchema }).strict();
export const participantDeleteSchema = z.object({
  workshop: workshopKeySchema,
  id: z.string({ error: "Required" }).trim().min(1, "Required").max(32),
  name: requiredText("Participant name", 160),
}).strict();
export const addParticipantsSchema = z.object({
  workshop: workshopKeySchema,
  userIds: z.array(userIdSchema, { error: "Required" }).min(1, "Required").max(500, "You can add at most 500 users at a time"),
}).strict().transform(({ workshop, userIds }) => ({ workshop, userIds: [...new Set(userIds)] }));

export const adminLoginSchema = z.object({ password: z.string({ error: "Required" }).min(1, "Required").max(1024) }).strict();
export const certificateLookupSchema = z.object({
  id: z.string({ error: "Required" }).trim().min(1, "Required").max(160, "Certificate ID is too long").regex(/^[A-Za-z0-9]+(?:[\s\-_/][A-Za-z0-9]+)*$/, "Invalid format"),
  workshop: z.string().trim().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Invalid format").optional().transform((value) => value || undefined),
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
