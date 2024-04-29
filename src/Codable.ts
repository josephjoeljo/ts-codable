const METADATA_KEY_CODABLE_TYPE = 'codableType';
const METADATA_KEY_CODING_KEYS = 'codingKeys';

class Codable {
  
    static decode<T extends typeof Codable>(this: T, data: { [ key: string]: any }): InstanceType<T> {
        
      // raw decoded object
      const keysValues: { [key: string]: any} = {};
        
      // convert a value into the specified class/type
      const convert = <L extends typeof Codable>(value: any, _class: L): InstanceType<L> | InstanceType<L>[] => {
        if (Array.isArray(value)) {
          return value.map(v => _class.decode(v));
        } else if (value === null || value === undefined) {
          return value;
        } else {
          return _class.decode(value);
        }
      };

      const instance = new this();
      const reverseCodingKeys: { [key: string]: string } = {};
      const codingKeys: any = Reflect.get(this, METADATA_KEY_CODING_KEYS);

      // If we have coding keys we reverse the coding to make decoding easier
      if (codingKeys) {
        Object.keys(codingKeys).forEach(key => {
          const value: string = codingKeys[key];
          reverseCodingKeys[value] = key;
        });
      }

      // Go through the data object's keys and decode the object
      Object.keys(data).forEach(key => {
        const propKey = codingKeys ? reverseCodingKeys[key] : key;
        const _class: any = Reflect.get(this, `${METADATA_KEY_CODABLE_TYPE}-${key}`);
        let value = data[key];
        if (_class) {
          value = convert(value, _class);
        }
        keysValues[propKey] = value;
      });

      return Object.assign(instance, keysValues) as InstanceType<T>;
    }

    encode(): object {
        const data: { [key: string]: any } = {};
        let properties = [];
        const codingKeys = Reflect.get(this.constructor, METADATA_KEY_CODING_KEYS);
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

    private getOwnProperties() {
      const descriptors = Object.getOwnPropertyDescriptors(this.constructor.prototype);
      const dynamicProperties = Object.keys(descriptors).filter((key) => !!descriptors[key]['get']);
      return ([] as string[]).concat(Object.keys(this), dynamicProperties);
    }
}


function CodableType<T extends typeof Codable>(_class: T) {
    return (target: any, propertyKey: any) => {
        Reflect.defineProperty(
            _class,
            `${METADATA_KEY_CODABLE_TYPE}-${propertyKey}`,
            target.constructor,
        );
    };
}

/**
 * 
 * @param codingKeys  dictionary of keys to code the values by
 * @returns 
 */
function CodingKeys(codingKeys: {[key: string]: string}) {
    return (constructor: Function) => {
        Reflect.defineProperty(constructor, METADATA_KEY_CODING_KEYS, codingKeys);
    }
}

export {
    Codable,
    CodingKeys,
    CodableType
}