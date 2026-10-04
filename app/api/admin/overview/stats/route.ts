import { adminPost } from "@/lib/adminApi";
import { successResponse } from "@/lib/api-response";
import OrganizerModel from "@/models/Organizer";
import ParticipantModel from "@/models/Participant";
import UserModel from "@/models/User";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export const POST = adminPost(async () => {
  const [
    workshops,
    registeredUsers,
    organizers,
    activeOrganizers,
    registrations,
    present,
    enrolledUserIds,
    recentWorkshops,
    recentUsers,
    recentOrganizers,
    enrollmentCounts,
  ] = await Promise.all([
    WorkshopModel.countDocuments(),
    UserModel.countDocuments(),
    OrganizerModel.countDocuments(),
    OrganizerModel.countDocuments({ isActive: true }),
    ParticipantModel.countDocuments(),
    ParticipantModel.countDocuments({ attendance: true }),
    ParticipantModel.distinct("userId"),
    WorkshopModel.find().sort({ createdAt: -1 }).limit(5).select("key workshopName workshopCode eventDate eventYear createdAt").lean(),
    UserModel.find({ isActive: { $ne: false } }).sort({ createdAt: -1 }).limit(5).select("userId fullName emailAddress createdAt").lean(),
    OrganizerModel.find().sort({ createdAt: -1 }).limit(5).select("organizerId fullName emailAddress isActive createdAt").lean(),
    ParticipantModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$workshop", count: { $sum: 1 } } },
    ]),
  ]);

  const enrolledUsers = await UserModel.countDocuments({ userId: { $in: enrolledUserIds } });
  const absent = Math.max(registrations - present, 0);
  const enrollmentCountByWorkshop = new Map(enrollmentCounts.map((entry) => [entry._id, entry.count]));
  const content = {
    totals: {
      workshops,
      registeredUsers,
      organizers,
      activeOrganizers,
      registrations,
      enrolledUsers,
      usersWithoutEvents: Math.max(registeredUsers - enrolledUsers, 0),
      present,
      absent,
    },
    recentWorkshops: recentWorkshops.map((item) => ({
      key: item.key,
      workshopName: item.workshopName,
      workshopCode: item.workshopCode,
      eventDate: item.eventDate,
      eventYear: item.eventYear,
      registrations: enrollmentCountByWorkshop.get(item.key) ?? 0,
    })),
    recentUsers: recentUsers.map((user) => ({
      userId: user.userId,
      fullName: user.fullName,
      emailAddress: user.emailAddress ?? "",
      createdAt: user.createdAt.toISOString(),
    })),
    recentOrganizers: recentOrganizers.map((organizer) => ({
      organizerId: organizer.organizerId,
      fullName: organizer.fullName,
      emailAddress: organizer.emailAddress ?? "",
      isActive: organizer.isActive,
      createdAt: organizer.createdAt.toISOString(),
    })),
  };

  return successResponse(content, "Successfully retrieved admin overview", 1);
}, "Admin overview statistics");
