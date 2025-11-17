export class VerificationLevelChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly previousLevel: number,
    public readonly newLevel: number,
  ) {}
}
