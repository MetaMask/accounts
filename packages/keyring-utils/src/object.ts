export class TypedObject {
  static keys<ObjectType extends object>(
    obj: ObjectType,
  ): (keyof ObjectType)[] {
    return Object.keys(obj) as (keyof ObjectType)[];
  }

  static entries<ObjectType extends object>(
    obj: ObjectType,
  ): [keyof ObjectType, ObjectType[keyof ObjectType]][] {
    return Object.entries(obj) as [
      keyof ObjectType,
      ObjectType[keyof ObjectType],
    ][];
  }

  static values<ObjectType extends object>(
    obj: ObjectType,
  ): ObjectType[keyof ObjectType][] {
    return Object.values(obj);
  }
}
