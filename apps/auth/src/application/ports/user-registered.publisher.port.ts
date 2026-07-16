export interface UserRegisteredPayload {
  userId: string;
  email: string;
  phoneNumber: string;
}

/** Publica el evento de usuario registrado (NATS en infraestructura). */
export abstract class UserRegisteredPublisher {
  abstract publish(payload: UserRegisteredPayload): Promise<void>;
}
