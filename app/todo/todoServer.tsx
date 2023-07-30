"use server";
import { formatToTimeZone } from "date-fns-timezone";
import { prisma } from "utils/database";
import z from "zod";

const inputNoId = z.object({
  title: z.string().min(1),
  priority: z.boolean(),
  userid: z.string(),
  tasks: z.array(z.object({ title: z.string() })),
  frequency: z.string().optional(),
  nextShow: z.date().optional(),
});
const inputWithId = z.object({
  id: z.string(),
  title: z.string().min(1),
  priority: z.boolean(),
  userid: z.string(),
  tasks: z.array(z.object({ title: z.string() })),
  frequency: z.string().optional().nullable(),
  nextShow: z.date().optional().nullable(),
});

export async function saveTodo(input) {
  inputNoId.safeParse(input);
  await prisma.toDo.create({
    data: {
      title: input.title,
      priority: input.priority,
      frequency: input.frequency,
      userid: input.userid,
      nextShow: input.nextShow,
      tasks: {
        create: input.tasks,
      },
    },
  });
}
export async function getToDos(input) {
  z.string().safeParse(input);
  const usersTodos = await prisma.toDo.findMany({
    where: { userid: input },
    include: {
      tasks: true,
    },
  });
  const todays: typeof usersTodos = [];
  const general: typeof usersTodos = [];
  const overall: typeof usersTodos = [];
  const expired: typeof usersTodos = [];
  usersTodos.map((item) => {
    if (item.nextShow == null) {
      if (item.priority) {
        general.unshift(item);
        overall.unshift(item);
      } else {
        general.push(item);
        overall.push(item);
      }
    } else {
      const todayServer = new Date();
      const today = new Date(new Date(todayServer.setHours(todayServer.getHours() - item.nextShow.getHours())).setHours(item.nextShow.getHours(), 0, 0, 0));
      if (item.nextShow?.valueOf() < today.valueOf()) {
        if (item.frequency == null) {
          expired.push(item);
        } else {
          const updateItem = prisma.toDo.update({
            where: {
              id: item.id,
            },
            data: {
              nextShow: item.nextShow,
            },
          });
          switch (item.frequency) {
            case "Daily":
              while (item.nextShow.valueOf() < today.valueOf()) {
                item.nextShow.setDate(item.nextShow.getDate() + 1);
              }
              break;
            case "Weekly":
              while (item.nextShow.valueOf() < today.valueOf()) {
                item.nextShow.setDate(item.nextShow.getDate() + 7);
              }
              break;
            case "Monthly":
              while (item.nextShow.valueOf() < today.valueOf()) {
                item.nextShow.setMonth(item.nextShow.getMonth() + 1);
              }
              break;
            case "Yearly":
              while (item.nextShow.valueOf() < today.valueOf()) {
                item.nextShow.setFullYear(item.nextShow.getFullYear() + 1);
              }
              break;
          }
          updateItem.then();
        }
      }
      if (item.nextShow.valueOf() == today.valueOf()) {
        if (item.priority) {
          todays.unshift(item);
        } else {
          todays.push(item);
        }
      }
      if (item.priority) {
        overall.unshift(item);
      } else {
        overall.push(item);
      }
    }
  });
  expired.map((item) => {
    overall.push(item);
  });
  return { todays, general, overall };
}

export async function deleteTodo(input) {
  z.string().safeParse(input);
  await prisma.toDo.delete({
    where: {
      id: input,
    },
  });
}
export async function updateTodo(input) {
  inputWithId.safeParse(input);
  const newtasks = input.tasks.map(({ id, todoID, ...title }) => title);
  await prisma.task.deleteMany({
    where: {
      todoID: input.id,
    },
  });
  newtasks.map((item, i) => {
    if (item.title == "") {
      newtasks.splice(i, 1);
    }
  });

  await prisma.toDo.update({
    where: {
      id: input.id,
    },
    data: {
      title: input.title,
      priority: input.priority,
      frequency: input.frequency,
      userid: input.userid,
      nextShow: input.nextShow,
      tasks: {
        create: newtasks,
      },
    },
  });
}
