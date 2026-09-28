import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class TasksService {
  constructor(private readonly notificationsService: NotificationsService) {}

  private async validateTaskMutationAccess(projectId: string, auth: AuthenticatedContext, isUpdateOrDelete = false) {
    if (auth.roles.includes('ADMIN')) return;
    if (!auth.employeeId) throw new ForbiddenException('You are not authorized to manage tasks');

    let targetEmployeeIds = [auth.employeeId];
    if (auth.roles.includes('MANAGER')) {
      const managedTeams = await db.orm.public.Team.where({ organizationId: auth.organizationId, managerId: auth.employeeId }).all();
      const teamIds = managedTeams.map(t => t.id);
      if (teamIds.length > 0) {
        const teamMembers = await db.orm.public.Employee.where(e => (e as any).teamId.in(teamIds)).all();
        for (const emp of teamMembers) {
          if (!targetEmployeeIds.includes(emp.id)) targetEmployeeIds.push(emp.id);
        }
      }
    }
    
    // Check if the actor (or one of their managed employees) is assigned to the project
    const assignment = await db.orm.public.EmployeeProject
      .where({ projectId })
      .where(a => (a as any).employeeId.in(targetEmployeeIds))
      .first();
    
    if (!assignment) {
      throw new ForbiddenException('You are not authorized to modify tasks in this project');
    }
  }

  async findAllByProject(projectId: string, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isAdmin = auth.roles && auth.roles.includes('ADMIN');
    if (!isAdmin) {
      if (!auth.employeeId) {
        throw new NotFoundException('Project not found');
      }
      
      let targetEmployeeIds = [auth.employeeId];
      if (auth.roles.includes('MANAGER')) {
        const managedTeams = await db.orm.public.Team.where({ organizationId: auth.organizationId, managerId: auth.employeeId }).all();
        const teamIds = managedTeams.map(t => t.id);
        if (teamIds.length > 0) {
          const teamMembers = await db.orm.public.Employee.where(e => (e as any).teamId.in(teamIds)).all();
          for (const emp of teamMembers) {
            if (!targetEmployeeIds.includes(emp.id)) targetEmployeeIds.push(emp.id);
          }
        }
      }
      
      const assignment = await db.orm.public.EmployeeProject
        .where({ projectId: projectId })
        .where(a => (a as any).employeeId.in(targetEmployeeIds))
        .first();
      
      if (!assignment) {
        throw new NotFoundException('Project not found');
      }
    }

    return db.orm.public.Task.where({ projectId, isActive: true }).all();
  }

  async findOne(id: string, auth: AuthenticatedContext) {
    const task = await db.orm.public.Task.where({ id }).first();
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const project = await db.orm.public.Project.where({ id: task.projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Task not found');
    }

    const isAdmin = auth.roles && auth.roles.includes('ADMIN');
    if (!isAdmin) {
      if (!auth.employeeId) {
        throw new NotFoundException('Task not found');
      }
      
      let targetEmployeeIds = [auth.employeeId];
      if (auth.roles.includes('MANAGER')) {
        const managedTeams = await db.orm.public.Team.where({ organizationId: auth.organizationId, managerId: auth.employeeId }).all();
        const teamIds = managedTeams.map(t => t.id);
        if (teamIds.length > 0) {
          const teamMembers = await db.orm.public.Employee.where(e => (e as any).teamId.in(teamIds)).all();
          for (const emp of teamMembers) {
            if (!targetEmployeeIds.includes(emp.id)) targetEmployeeIds.push(emp.id);
          }
        }
      }
      
      const assignment = await db.orm.public.EmployeeProject
        .where({ projectId: task.projectId })
        .where(a => (a as any).employeeId.in(targetEmployeeIds))
        .first();
      
      if (!assignment) {
        throw new NotFoundException('Task not found');
      }
    }

    return task;
  }

  async create(projectId: string, createTaskDto: CreateTaskDto, auth: AuthenticatedContext) {
    const { 
      name, description, status, isActive, 
      priority, assigneeId, startDate, dueDate, estimatedHours, parentTaskId
    } = createTaskDto;

    // Verify project exists and belongs to organization
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Reject creation under an inactive or completed/on-hold Project
    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new BadRequestException('Cannot create a task under an inactive or completed/on-hold project');
    }

    if (!auth.roles.includes('ADMIN') && !auth.roles.includes('MANAGER')) {
        throw new ForbiddenException('Only Admins and Managers can create new tasks');
    }

    await this.validateTaskMutationAccess(projectId, auth, false);

    // Check unique task name within the project
    const existingName = await db.orm.public.Task.where({ projectId, name }).first();
    if (existingName) {
      throw new ConflictException('Task with this name already exists in the project');
    }

    // Basic date validation
    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      throw new BadRequestException('startDate must be before or equal to dueDate');
    }

    // Parent task validation
    if (parentTaskId) {
      const parentTask = await db.orm.public.Task.where({ id: parentTaskId, projectId }).first();
      if (!parentTask) {
        throw new BadRequestException('Invalid parent task within this project');
      }
    }

    // Assignee validation
    if (assigneeId) {
      const assignment = await db.orm.public.EmployeeProject.where({ employeeId: assigneeId, projectId }).first();
      if (!assignment) {
        throw new BadRequestException('Assignee is not a member of this project');
      }
    }

    const taskData: any = {
      projectId,
      name,
      description: description ?? null,
      status,
      isActive: isActive ?? true,
      priority: priority ?? 'MEDIUM',
      creatorId: auth.employeeId ?? null,
      recurrence: (createTaskDto as any).recurrence ?? null,
    };

    if (assigneeId !== undefined) taskData.assigneeId = assigneeId;
    if (startDate !== undefined) taskData.startDate = startDate ? (globalThis as any).Temporal.Instant.from(new Date(startDate).toISOString()) : null;
    if (dueDate !== undefined) taskData.dueDate = dueDate ? (globalThis as any).Temporal.Instant.from(new Date(dueDate).toISOString()) : null;
    if (estimatedHours !== undefined) taskData.estimatedHours = estimatedHours;
    if (parentTaskId !== undefined) taskData.parentTaskId = parentTaskId;

    let task: any;
    let attempts = 0;
    while (attempts < 5) {
      try {
        await db.transaction(async (tx) => {
          const currentProject = await tx.orm.public.Project.where({ id: projectId }).first();
          if (!currentProject) throw new NotFoundException('Project not found');
          const nextSequence = (currentProject.taskSequence || 0) + 1;
          
          await tx.orm.public.Project.where({ id: projectId }).update({ taskSequence: nextSequence });
          
          taskData.ticketId = `${currentProject.code}-${nextSequence}`;
          task = await tx.orm.public.Task.create(taskData);
        });
        break; // Success!
      } catch (err: any) {
        if (err.code === 'P2002' || err.message?.includes('Unique constraint') || err.message?.includes('duplicate key')) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

    if (!task) {
      throw new Error('Concurrency failure: Could not generate a unique Ticket ID for the task after multiple attempts.');
    }

    if (task.assigneeId && task.assigneeId !== auth.employeeId) {
      await this.notificationsService.createNotification({
        recipientId: task.assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `You have been assigned to task: ${task.ticketId} - ${task.name}`,
        relatedEntityType: 'TASK',
        relatedEntityId: task.id,
      });
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, auth: AuthenticatedContext) {
    const task = await db.orm.public.Task.where({ id }).first();
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const project = await db.orm.public.Project.where({ id: task.projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Task not found');
    }
    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new BadRequestException('Cannot update a task under an inactive or completed/on-hold project');
    }

    await this.validateTaskMutationAccess(task.projectId, auth, true);

    if (!auth.roles.includes('ADMIN') && !auth.roles.includes('MANAGER')) {
       // Employees can only update task progress/status if they are assigned to the task specifically
       if (task.assigneeId !== auth.employeeId) {
           throw new ForbiddenException('Employees can only update tasks explicitly assigned to them');
       }
       // Employees cannot rename or change assignees
       if (updateTaskDto.name !== undefined && updateTaskDto.name !== task.name) throw new ForbiddenException('Employees cannot rename tasks');
       if (updateTaskDto.assigneeId !== undefined && updateTaskDto.assigneeId !== task.assigneeId) throw new ForbiddenException('Employees cannot reassign tasks');
    }

    if (task.status === 'COMPLETED' && updateTaskDto.status !== 'TODO' && updateTaskDto.status !== 'IN_PROGRESS' && updateTaskDto.status !== 'BLOCKED') {
      throw new BadRequestException('Cannot modify a completed task. Reopen it first by changing its status.');
    }

    const { 
      name, description, status, isActive,
      priority, assigneeId, startDate, dueDate, estimatedHours, parentTaskId, recurrence
    } = updateTaskDto;

    // Check unique name if it is being changed
    if (name && name !== task.name) {
      const existingName = await db.orm.public.Task.where({
        projectId: task.projectId,
        name,
      }).first();
      if (existingName && existingName.id !== task.id) {
        throw new ConflictException('Task with this name already exists in the project');
      }
    }

    // Date validation
    const newStartDate = startDate !== undefined ? (startDate ? new Date(startDate) : null) : task.startDate;
    const newDueDate = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : task.dueDate;
    if (newStartDate && newDueDate && new Date(newStartDate.toString()) > new Date(newDueDate.toString())) {
      throw new BadRequestException('startDate must be before or equal to dueDate');
    }

    // Parent task validation
    if (parentTaskId !== undefined && parentTaskId !== null) {
      if (parentTaskId === task.id) {
         throw new BadRequestException('Task cannot be its own parent');
      }
      const parentTask = await db.orm.public.Task.where({ id: parentTaskId, projectId: task.projectId }).first();
      if (!parentTask) {
        throw new BadRequestException('Invalid parent task within this project');
      }
    }

    // Assignee validation
    if (assigneeId !== undefined && assigneeId !== null) {
      const assignment = await db.orm.public.EmployeeProject.where({ employeeId: assigneeId, projectId: task.projectId }).first();
      if (!assignment) {
        throw new BadRequestException('Assignee is not a member of this project');
      }
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (priority !== undefined) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (startDate !== undefined) updateData.startDate = startDate ? (globalThis as any).Temporal.Instant.from(new Date(startDate).toISOString()) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? (globalThis as any).Temporal.Instant.from(new Date(dueDate).toISOString()) : null;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (parentTaskId !== undefined) updateData.parentTaskId = parentTaskId;
    if (recurrence !== undefined) updateData.recurrence = recurrence;

    let updated: any;

    let attempts = 0;
    while (attempts < 5) {
      try {
        await db.transaction(async (tx) => {
          const currentTask = await tx.orm.public.Task.where({ id }).first();
          if (!currentTask) throw new NotFoundException('Task not found');
          
          if (status === 'COMPLETED' && currentTask.status !== 'COMPLETED') {
            const activeRecurrence = recurrence !== undefined ? recurrence : currentTask.recurrence;
            if (activeRecurrence && !currentTask.nextOccurrenceId) {
              const calculateNextDate = (dateVal: any, rec: string) => {
                if (!dateVal) return null;
                const d = new Date(dateVal.toString());
                if (rec === 'DAILY') d.setDate(d.getDate() + 1);
                else if (rec === 'WEEKLY') d.setDate(d.getDate() + 7);
                else if (rec === 'MONTHLY') d.setMonth(d.getMonth() + 1);
                return (globalThis as any).Temporal.Instant.from(d.toISOString());
              };

              const nextStartDate = calculateNextDate(currentTask.startDate, activeRecurrence);
              const nextDueDate = calculateNextDate(currentTask.dueDate, activeRecurrence);

              const currentProject = await tx.orm.public.Project.where({ id: currentTask.projectId }).first();
              if (!currentProject) throw new NotFoundException('Project not found');
              const nextSequence = (currentProject.taskSequence || 0) + 1;
              await tx.orm.public.Project.where({ id: currentTask.projectId }).update({ taskSequence: nextSequence });

              const nextTaskData: any = {
                projectId: currentTask.projectId,
                name: currentTask.name,
                description: currentTask.description,
                status: 'TODO',
                isActive: true,
                priority: currentTask.priority,
                creatorId: auth.employeeId,
                assigneeId: currentTask.assigneeId,
                requirementId: currentTask.requirementId,
                milestoneId: currentTask.milestoneId,
                parentTaskId: currentTask.parentTaskId,
                estimatedHours: currentTask.estimatedHours,
                recurrence: activeRecurrence,
                startDate: nextStartDate,
                dueDate: nextDueDate,
                ticketId: `${currentProject.code}-${nextSequence}`
              };

              const generatedTask = await tx.orm.public.Task.create(nextTaskData);
              updateData.nextOccurrenceId = generatedTask.id;
            }
          } else if (status === 'COMPLETED' && currentTask.status === 'COMPLETED') {
             // Task already completed concurrently, skip generation to prevent duplicate tasks
          }

          updated = await tx.orm.public.Task.where({ id }).update(updateData);
        });
        break; // Success
      } catch (err: any) {
        if (err.code === 'P2002' || err.message?.includes('Unique constraint') || err.message?.includes('duplicate key')) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

    if (updated && assigneeId !== undefined && assigneeId !== task.assigneeId && assigneeId !== null && assigneeId !== auth.employeeId) {
      await this.notificationsService.createNotification({
        recipientId: assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'Task Assigned To You',
        message: `You have been assigned to task: ${(updated as any).ticketId} - ${(updated as any).name}`,
        relatedEntityType: 'TASK',
        relatedEntityId: (updated as any).id,
      });
    }

    return updated;
  }

  async addDependency(predecessorId: string, successorId: string, auth: AuthenticatedContext) {
    if (predecessorId === successorId) {
      throw new BadRequestException('Task cannot depend on itself');
    }

    const predecessor = await db.orm.public.Task.where({ id: predecessorId }).first();
    const successor = await db.orm.public.Task.where({ id: successorId }).first();

    if (!predecessor || !successor) {
      throw new NotFoundException('One or both tasks not found');
    }

    if (predecessor.projectId !== successor.projectId) {
      throw new BadRequestException('Cross-project dependencies are not allowed');
    }

    await this.validateTaskMutationAccess(predecessor.projectId, auth, true);
    if (!auth.roles.includes('ADMIN') && !auth.roles.includes('MANAGER')) {
        throw new ForbiddenException('Only Admins and Managers can manage task dependencies');
    }

    // Security check: ensure user has access to this project
    const project = await db.orm.public.Project.where({ id: predecessor.projectId, organizationId: auth.organizationId }).first();
    if (!project) {
       throw new NotFoundException('Project not found');
    }
    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new BadRequestException('Cannot modify dependencies for an inactive or completed/on-hold project');
    }

    // Check if duplicate
    const existing = await db.orm.public.TaskDependency.where({ predecessorId, successorId }).first();
    if (existing) {
      throw new ConflictException('Dependency already exists');
    }

    return db.orm.public.TaskDependency.create({
      predecessorId,
      successorId,
      type: 'FS'
    });
  }

  async findDependencies(taskId: string, auth: AuthenticatedContext) {
    await this.findOne(taskId, auth); // Access check
    
    const predecessors = await db.orm.public.TaskDependency.where({ successorId: taskId }).all();
    const successors = await db.orm.public.TaskDependency.where({ predecessorId: taskId }).all();

    return { predecessors, successors };
  }

  async removeDependency(taskId: string, successorId: string, auth: AuthenticatedContext) {
    // Security check via finding the task
    const task = await this.findOne(taskId, auth);

    await this.validateTaskMutationAccess(task.projectId, auth, true);
    if (!auth.roles.includes('ADMIN') && !auth.roles.includes('MANAGER')) {
        throw new ForbiddenException('Only Admins and Managers can manage task dependencies');
    }

    const project = await db.orm.public.Project.where({ id: task.projectId }).first();
    if (project && (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD')) {
      throw new BadRequestException('Cannot modify dependencies for an inactive or completed/on-hold project');
    }

    const dependency = await db.orm.public.TaskDependency.where({ predecessorId: taskId, successorId }).first();
    if (!dependency) {
      throw new NotFoundException('Dependency not found');
    }

    await db.orm.public.TaskDependency.where({ predecessorId: taskId, successorId }).delete();
    return { success: true };
  }

  // --- Task Comments ---

  async getComments(taskId: string, auth: AuthenticatedContext) {
    // 1. Verify user can access this task
    await this.findOne(taskId, auth);

    // 2. Fetch comments ordered by createdAt
    const comments = await db.orm.public.TaskComment.where({ taskId }).all();
    
    // Also fetch author details (mocking join for now or doing it manually)
    // Since Prisma client here seems lightweight, we can just fetch authors separately
    const authorIds = [...new Set(comments.map(c => c.authorId))];
    const authors = authorIds.length > 0 
      ? await db.orm.public.Employee.where(e => (e as any).id.in(authorIds)).all()
      : [];
    
    const authorMap = authors.reduce((map, emp) => {
      map[emp.id] = { id: emp.id, name: emp.name };
      return map;
    }, {} as Record<string, any>);

    // Return merged data
    return comments.map(c => ({
      ...c,
      author: authorMap[c.authorId] || { id: c.authorId, name: 'Unknown' }
    })).sort((a, b) => new Date(a.createdAt.toString()).getTime() - new Date(b.createdAt.toString()).getTime());
  }

  async addComment(taskId: string, comment: string, auth: AuthenticatedContext) {
    // 1. Verify access
    const task = await this.findOne(taskId, auth);
    const project = await db.orm.public.Project.where({ id: task.projectId }).first();
    if (project && (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD')) {
      throw new BadRequestException('Cannot comment on tasks in an inactive or completed/on-hold project');
    }
    if (!auth.employeeId) {
      throw new BadRequestException('Only employees can comment');
    }

    // 2. Create comment
    const created = await db.orm.public.TaskComment.create({
      taskId,
      authorId: auth.employeeId,
      comment
    });

    const author = await db.orm.public.Employee.where({ id: auth.employeeId }).first();

    if (task && task.assigneeId && task.assigneeId !== auth.employeeId) {
      await this.notificationsService.createNotification({
        recipientId: task.assigneeId,
        type: 'COMMENT_ADDED',
        title: 'New Comment on Task',
        message: `${author?.name || 'Someone'} commented on task: ${task.ticketId}`,
        relatedEntityType: 'TASK',
        relatedEntityId: task.id,
      });
    }

    return {
      ...created,
      author: author ? { id: author.id, name: author.name } : { id: auth.employeeId, name: 'Unknown' }
    };
  }

  async editComment(taskId: string, commentId: string, text: string, auth: AuthenticatedContext) {
    // 1. Verify task access
    const task = await this.findOne(taskId, auth);
    const project = await db.orm.public.Project.where({ id: task.projectId }).first();
    if (project && (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD')) {
      throw new BadRequestException('Cannot edit comments in an inactive or completed/on-hold project');
    }

    // 2. Verify comment exists
    const comment = await db.orm.public.TaskComment.where({ id: commentId, taskId }).first();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // 3. Verify authorship or admin
    const isAdmin = auth.roles && auth.roles.includes('ADMIN');
    if (!isAdmin && comment.authorId !== auth.employeeId) {
      throw new BadRequestException('You can only edit your own comments');
    }

    const updated = await db.orm.public.TaskComment.where({ id: commentId }).update({
      comment: text,
      updatedAt: (globalThis as any).Temporal.Instant.from(new Date().toISOString())
    });

    return updated;
  }

  async deleteComment(taskId: string, commentId: string, auth: AuthenticatedContext) {
    // 1. Verify task access
    const task = await this.findOne(taskId, auth);
    const project = await db.orm.public.Project.where({ id: task.projectId }).first();
    if (project && (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD')) {
      throw new BadRequestException('Cannot delete comments in an inactive or completed/on-hold project');
    }

    // 2. Verify comment exists
    const comment = await db.orm.public.TaskComment.where({ id: commentId, taskId }).first();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // 3. Verify authorship or admin
    const isAdmin = auth.roles && auth.roles.includes('ADMIN');
    if (!isAdmin && comment.authorId !== auth.employeeId) {
      throw new BadRequestException('You can only delete your own comments');
    }

    await db.orm.public.TaskComment.where({ id: commentId }).delete();
    return { success: true };
  }
}
