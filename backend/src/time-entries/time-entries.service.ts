import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto.js';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto.js';

@Injectable()
export class TimeEntriesService {
  async validateReferences(employeeId: string, projectId: string, taskId: string, activityId: string) {
    const employee = await db.orm.public.Employee.where({ id: employeeId }).first();
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.isActive) throw new BadRequestException('Employee is inactive');

    const project = await db.orm.public.Project.where({ id: projectId }).first();
    if (!project) throw new NotFoundException('Project not found');
    if (!project.isActive) throw new BadRequestException('Project is inactive');

    if (employee.organizationId !== project.organizationId) {
      throw new BadRequestException('Cross-organization assignment is not allowed');
    }

    const assignment = await db.orm.public.EmployeeProject.where({ employeeId, projectId }).first();
    if (!assignment) throw new BadRequestException('Employee is not assigned to this project');

    const task = await db.orm.public.Task.where({ id: taskId }).first();
    if (!task) throw new NotFoundException('Task not found');
    if (task.projectId !== projectId) throw new BadRequestException('Task does not belong to the project');
    if (!task.isActive) throw new BadRequestException('Task is inactive');

    const activity = await db.orm.public.Activity.where({ id: activityId }).first();
    if (!activity) throw new NotFoundException('Activity not found');
    if (activity.projectId !== projectId) throw new BadRequestException('Activity does not belong to the project');
    if (!activity.isActive) throw new BadRequestException('Activity is inactive');
  }

  async create(dto: CreateTimeEntryDto) {
    await this.validateReferences(dto.employeeId, dto.projectId, dto.taskId, dto.activityId);

    const timeEntry = await db.orm.public.TimeEntry.create({
      employeeId: dto.employeeId,
      projectId: dto.projectId,
      taskId: dto.taskId,
      activityId: dto.activityId,
      date: dto.date,
      hours: dto.hours,
      remarks: dto.remarks ?? null,
    });

    return timeEntry;
  }

  async findAllByEmployee(employeeId: string) {
    const employee = await db.orm.public.Employee.where({ id: employeeId }).first();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const entries = await db.orm.public.TimeEntry.where({ employeeId })
      .all();

    return entries.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async findOne(id: string) {
    const entry = await db.orm.public.TimeEntry.where({ id }).first();
    if (!entry) {
      throw new NotFoundException('Time Entry not found');
    }
    return entry;
  }

  async update(id: string, dto: UpdateTimeEntryDto) {
    const existingEntry = await db.orm.public.TimeEntry.where({ id }).first();
    if (!existingEntry) {
      throw new NotFoundException('Time Entry not found');
    }

    const newProjectId = dto.projectId ?? existingEntry.projectId;
    const newTaskId = dto.taskId ?? existingEntry.taskId;
    const newActivityId = dto.activityId ?? existingEntry.activityId;

    if (dto.projectId || dto.taskId || dto.activityId) {
      await this.validateReferences(existingEntry.employeeId, newProjectId, newTaskId, newActivityId);
    }

    const updatedData: any = {};
    if (dto.projectId !== undefined) updatedData.projectId = dto.projectId;
    if (dto.taskId !== undefined) updatedData.taskId = dto.taskId;
    if (dto.activityId !== undefined) updatedData.activityId = dto.activityId;
    if (dto.date !== undefined) updatedData.date = dto.date;
    if (dto.hours !== undefined) updatedData.hours = dto.hours;
    if (dto.remarks !== undefined) updatedData.remarks = dto.remarks === null ? null : dto.remarks;

    if (Object.keys(updatedData).length === 0) {
      return existingEntry;
    }

    const updatedEntry = await db.orm.public.TimeEntry.where({ id }).update(updatedData);
    return updatedEntry;
  }
}
