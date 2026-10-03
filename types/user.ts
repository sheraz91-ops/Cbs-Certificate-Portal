/** Profile fields entered when an admin registers a portal user. */
export interface UserProfileInput {
  emailAddress: string;
  fullName: string;
  registrationNumber: string;
  department: string;
  semester: string;
  section: string;
  institute: string;
  whatsappNumber: string;
  cnic: string;
}

/** User record returned to authenticated admin screens. */
export interface UserRecord extends UserProfileInput {
  userId: string;
  createdAt: string;
}

export interface UserEnrollment {
  workshopKey: string;
  workshopName: string;
  eventYear: string;
  eventDate: string;
  participantId: string;
  certificateId: string;
  attendance: boolean;
}

export interface UserDetailsRecord extends UserRecord {
  enrollments: UserEnrollment[];
}

/** Small user listing returned for the admin users table. */
export interface UserSummary {
  userId: string;
  fullName: string;
  emailAddress: string;
  registrationNumber: string;
  department: string;
}
