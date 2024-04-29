const METADATA_KEY_CODABLE_TYPE = Symbol('codable: codable-type');
const METADATA_KEY_CODING_KEYS = Symbol('codable: coding-keys');

class Codable {
    codingKeys: Object;

    static decode<T extends typeof Codable>(this: T, data: { [ key: string]: any }): InstanceType<T> {
        const keysValues: { [key: string]: any} = {};
        const convert = <L extends typeof Codable>(value: any, klass: L): InstanceType<L> | InstanceType<L>[] => {
          if (Array.isArray(value)) {
            return value.map(v => klass.decode(v));
          } else if (value === null || value === undefined) {
            return value;
          } else {
            return klass.decode(value);
          }
        };
        const instance = new this();
        const reverseCodingKyes: { [key: string]: string } = {};
        const codingKeys = Reflect.get(this, METADATA_KEY_CODING_KEYS);
        if (codingKeys) {
          Object.keys(codingKeys).forEach(key => {
            const value: string = codingKeys[key];
            reverseCodingKyes[value] = key;
          });
        }
        Object.keys(data).forEach(key => {
          const propKey = codingKeys ? reverseCodingKyes[key] : key;
          const klass = Reflect.getMetadata(METADATA_KEY_CODABLE_TYPE, this, propKey);
          let value = data[key];
          if (klass) {
            value = convert(value, klass);
          }
          keysValues[propKey] = value;
        });
        return Object.assign(instance, keysValues) as InstanceType<T>;
    }

    encode(): object {
        const data: { [key: string]: any } = {};
        let properties = [];
        const codingKeys = Reflect.getMetadata(METADATA_KEY_CODING_KEYS, this.constructor);
        if (codingKeys) {
          properties = Object.keys(codingKeys);
        } else {
          properties = this.getOwnProperties()
        }
        const convert = (value: any): any => {
          if (value instanceof Codable) {
            return value.encode();
          } else {
            return value;
          }
        };
        properties.forEach(prop => {
          const value = (this as any)[prop];
          if (codingKeys) {
            prop = codingKeys[prop];
          }
          if (Array.isArray(value)) {
            data[prop] = value.map(v => convert(v));
          } else {
            data[prop] = convert(value);
          }
        });
        return data;
    }
}

export function CodableType<T extends typeof Codable>(_class: T) {
    return (target: any, propertyKey: any) => {
        Reflect.defineProperty(
            _class,
            propertyKey,
            target.constructor,
        );
    };
}

export function CodingKeys(codingKeys: {[key: string]: string}) {
    return (constructor: Function) => {
        Reflect.defineProperty(constructor, METADATA_KEY_CODING_KEYS, codingKeys);
    }
}

export {
    Codable
}