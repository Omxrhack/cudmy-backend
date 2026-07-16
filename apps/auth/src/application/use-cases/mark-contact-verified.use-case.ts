import {
  UserRepository,
  VerifiedChannel,
} from '../../domain/ports/user.repository';

export interface MarkContactVerifiedCommand {
  userId: string;
  channel: VerifiedChannel;
}

export class MarkContactVerifiedUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(cmd: MarkContactVerifiedCommand): Promise<void> {
    await this.users.markVerified(cmd.userId, cmd.channel);
  }
}
