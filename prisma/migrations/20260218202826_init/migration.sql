-- CreateEnum
CREATE TYPE "RoomAccessType" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "accessType" "RoomAccessType" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "RoomMember" ADD COLUMN     "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING';
