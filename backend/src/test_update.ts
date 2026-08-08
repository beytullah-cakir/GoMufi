import prisma from './db/prisma';

async function main() {
  const courseId = 6;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    console.error('Course not found');
    return;
  }

  console.log('Found course:', course.title);

  let updatedCurriculum = Array.isArray(course.curriculum) ? (course.curriculum as any[]) : [];
  const filteredNotes = Array.isArray(course.notes) ? (course.notes as any[]) : [];

  console.log('Trying to update course...');
  try {
    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        curriculum: updatedCurriculum,
        notes: filteredNotes
      }
    });
    console.log('Update succeeded!', updated.title);
  } catch (error: any) {
    console.error('Prisma update failed with error details:\n', error);
  }
}

main()
  .finally(() => {
    process.exit(0);
  });
