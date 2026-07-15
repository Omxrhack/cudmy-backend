import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/** Valida que el valor sea igual al de otra propiedad del mismo DTO (p. ej. confirmPassword === password). */
export function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'Match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedProperty] = args.constraints as [string];
          const related = (args.object as Record<string, unknown>)[
            relatedProperty
          ];
          return value === related;
        },
        defaultMessage(args: ValidationArguments): string {
          const [relatedProperty] = args.constraints as [string];
          return `${args.property} debe coincidir con ${relatedProperty}`;
        },
      },
    });
  };
}
