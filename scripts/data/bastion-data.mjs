const { ArrayField, HTMLField, SchemaField, StringField } = foundry.data.fields;

/**
 * Roles which can be given to a space, with the localization key of their label.
 * @type {Record<string, string>}
 */
export const SPACE_ROLES = {
  mercenary: "ENHANCED_BASTIONS.Role.mercenary",
  artisan: "ENHANCED_BASTIONS.Role.artisan",
  scholar: "ENHANCED_BASTIONS.Role.scholar",
  worker: "ENHANCED_BASTIONS.Role.worker"
};

/**
 * Orders available in a space for each role, with the localization key of their label.
 * @type {Record<string, Record<string, string>>}
 */
export const SPACE_ORDERS = {
  mercenary: {
    keepOrder: "ENHANCED_BASTIONS.Order.keepOrder",
    patrol: "ENHANCED_BASTIONS.Order.patrol",
    hunt: "ENHANCED_BASTIONS.Order.hunt",
    explore: "ENHANCED_BASTIONS.Order.explore"
  },
  artisan: {
    craft: "ENHANCED_BASTIONS.Order.craft",
    repair: "ENHANCED_BASTIONS.Order.repair",
    enchant: "ENHANCED_BASTIONS.Order.enchant",
    teach: "ENHANCED_BASTIONS.Order.teach"
  },
  scholar: {
    study: "ENHANCED_BASTIONS.Order.study",
    castSpells: "ENHANCED_BASTIONS.Order.castSpells",
    createScrolls: "ENHANCED_BASTIONS.Order.createScrolls",
    translate: "ENHANCED_BASTIONS.Order.translate"
  },
  worker: {
    build: "ENHANCED_BASTIONS.Order.build",
    harvest: "ENHANCED_BASTIONS.Order.harvest",
    assist: "ENHANCED_BASTIONS.Order.assist",
    transport: "ENHANCED_BASTIONS.Order.transport",
    tendAnimals: "ENHANCED_BASTIONS.Order.tendAnimals"
  }
};

/**
 * Actor types which can occupy a place.
 * @type {string[]}
 */
export const OCCUPANT_TYPES = ["npc", "character"];

/**
 * Create the field holding the stable identifier of a space or a place.
 * @returns {StringField}
 */
function idField() {
  return new StringField({ required: true, blank: false, initial: () => foundry.utils.randomID() });
}

/** System data of the bastion actor. */
export default class BastionData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      description: new HTMLField({ label: "ENHANCED_BASTIONS.Bastion.Description" }),
      spaces: new ArrayField(new SchemaField({
        id: idField(),
        name: new StringField({ required: true, blank: true }),
        role: new StringField({ required: true, blank: true }),
        places: new ArrayField(new SchemaField({
          id: idField(),
          occupant: new StringField({ required: true, blank: true }),
          order: new StringField({ required: true, blank: true })
        }))
      }))
    };
  }
}
