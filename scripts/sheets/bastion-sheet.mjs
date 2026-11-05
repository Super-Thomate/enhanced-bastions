import { OCCUPANT_TYPES, SPACE_ORDERS, SPACE_ROLES } from "../data/bastion-data.mjs";

const { DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const { TextEditor } = foundry.applications.ux;

/**
 * Find a place by its identifier.
 * @param {object[]} spaces  The spaces of a bastion.
 * @param {string} placeId   The identifier of the place.
 * @returns {object|undefined}
 */
function findPlace(spaces, placeId) {
  return spaces.flatMap(s => s.places).find(p => p.id === placeId);
}

/** Sheet of the bastion actor. */
export default class BastionSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dnd5e2", "vertical-tabs", "enhanced-bastions", "bastion-sheet"],
    position: { width: 1040, height: 680 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      addSpace: BastionSheet.#onAddSpace,
      deleteSpace: BastionSheet.#onDeleteSpace,
      addPlace: BastionSheet.#onAddPlace,
      deletePlace: BastionSheet.#onDeletePlace,
      removeOccupant: BastionSheet.#onRemoveOccupant
    }
  };

  /** @override */
  static PARTS = {
    header: { template: "modules/enhanced-bastions/templates/bastion-header.hbs" },
    spaces: {
      template: "modules/enhanced-bastions/templates/bastion-spaces.hbs",
      scrollable: [""]
    },
    description: { template: "modules/enhanced-bastions/templates/bastion-description.hbs" },
    tabs: {
      id: "tabs",
      classes: ["tabs-right"],
      template: "systems/dnd5e/templates/shared/sidebar-tabs.hbs"
    }
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "spaces", icon: "fa-solid fa-table-cells-large", label: "ENHANCED_BASTIONS.Space.Label" },
        { id: "description", icon: "fa-solid fa-feather", label: "ENHANCED_BASTIONS.Bastion.Description" }
      ],
      initial: "spaces"
    }
  };

  /** @override */
  get title() {
    return this.actor.name;
  }

  /** @inheritDoc */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Leave the other parts alone, so that an edit in progress in them is not lost.
    if ( (options.renderContext === "updateActor") && options.renderData.system?.spaces ) options.parts = ["spaces"];
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.enrichedDescription = await TextEditor.implementation.enrichHTML(this.actor.system.description, {
      secrets: this.actor.isOwner,
      relativeTo: this.actor
    });
    context.spaces = this.actor.system.spaces.map(space => ({
      ...space,
      roleLabel: SPACE_ROLES[space.role],
      orders: SPACE_ORDERS[space.role],
      places: space.places.map(place => {
        const occupant = game.actors.get(place.occupant);
        return {
          ...place,
          occupant: occupant ? { name: occupant.name, img: occupant.img } : null,
          orderLabel: SPACE_ORDERS[space.role]?.[place.order]
        };
      })
    }));
    context.roles = SPACE_ROLES;
    context.canManageSpaces = game.user.isGM && this.isEditable;
    return context;
  }

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    const input = event.target.closest(".space-name, .space-role, .place-order");
    if ( !input ) return super._onChangeForm(formConfig, event);
    const value = input.value.trim();
    const { spaceId } = input.closest("[data-space-id]").dataset;
    this.#updateSpaces(spaces => {
      const space = spaces.find(s => s.id === spaceId);
      if ( input.matches(".place-order") ) findPlace(spaces, input.closest("[data-place-id]").dataset.placeId).order = value;
      else if ( input.matches(".space-name") ) space.name = value;
      else {
        space.role = value;
        for ( const place of space.places ) place.order = "";
      }
    });
  }

  /** @override */
  async _onDropActor(event, actor) {
    const placeId = event.target.closest("[data-place-id]")?.dataset.placeId;
    if ( !placeId ) return null;
    if ( !OCCUPANT_TYPES.includes(actor.type) || (actor.collection !== game.actors) ) {
      ui.notifications.warn("ENHANCED_BASTIONS.Place.InvalidOccupant", { localize: true });
      return null;
    }
    const target = findPlace(this.actor.system.spaces, placeId);
    if ( target.occupant === actor.id ) return null;
    if ( game.actors.has(target.occupant) ) {
      ui.notifications.warn("ENHANCED_BASTIONS.Place.AlreadyOccupied", { localize: true });
      return null;
    }
    await this.#updateSpaces(spaces => {
      if ( actor.type === "character" ) {
        const current = spaces.flatMap(s => s.places).find(p => p.occupant === actor.id);
        if ( current ) Object.assign(current, { occupant: "", order: "" });
      }
      Object.assign(findPlace(spaces, placeId), { occupant: actor.id, order: "" });
    });
    return actor;
  }

  /** @override */
  async _onDropItem() {
    return null;
  }

  /** @override */
  async _onDropActiveEffect() {
    return null;
  }

  /**
   * Apply a change to the bastion's spaces.
   * @param {function(object[]): void} change  Function which mutates a copy of the spaces.
   * @returns {Promise<Actor>}
   */
  #updateSpaces(change) {
    const { spaces } = this.actor.system.toObject();
    change(spaces);
    return this.actor.update({ "system.spaces": spaces });
  }

  /**
   * Add a new space to the bastion.
   * @this {BastionSheet}
   */
  static async #onAddSpace() {
    const name = game.i18n.localize("ENHANCED_BASTIONS.Space.New");
    await this.#updateSpaces(spaces => spaces.push({ id: foundry.utils.randomID(), name, places: [] }));
  }

  /**
   * Delete a space after confirmation.
   * @this {BastionSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onDeleteSpace(event, target) {
    const { spaceId } = target.closest("[data-space-id]").dataset;
    const space = this.actor.system.spaces.find(s => s.id === spaceId);
    const name = foundry.utils.escapeHTML(space.name || game.i18n.localize("ENHANCED_BASTIONS.Space.Unnamed"));
    const confirmed = await DialogV2.confirm({
      window: { title: "ENHANCED_BASTIONS.Space.Delete" },
      content: `<p>${game.i18n.format("ENHANCED_BASTIONS.Space.DeleteConfirm", { name })}</p>`,
      modal: true
    });
    if ( confirmed ) await this.#updateSpaces(spaces => spaces.findSplice(s => s.id === spaceId));
  }

  /**
   * Add a new place to a space.
   * @this {BastionSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onAddPlace(event, target) {
    const { spaceId } = target.closest("[data-space-id]").dataset;
    await this.#updateSpaces(spaces => {
      spaces.find(s => s.id === spaceId).places.push({ id: foundry.utils.randomID() });
    });
  }

  /**
   * Remove a place from a space.
   * @this {BastionSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onDeletePlace(event, target) {
    const { spaceId } = target.closest("[data-space-id]").dataset;
    const { placeId } = target.closest("[data-place-id]").dataset;
    const { places } = this.actor.system.spaces.find(s => s.id === spaceId);
    if ( game.actors.has(places.find(p => p.id === placeId).occupant) ) {
      ui.notifications.warn("ENHANCED_BASTIONS.Place.DeleteOccupied", { localize: true });
      return;
    }
    await this.#updateSpaces(spaces => {
      spaces.find(s => s.id === spaceId).places.findSplice(p => p.id === placeId);
    });
  }

  /**
   * Remove the actor occupying a place.
   * @this {BastionSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRemoveOccupant(event, target) {
    const { placeId } = target.closest("[data-place-id]").dataset;
    await this.#updateSpaces(spaces => Object.assign(findPlace(spaces, placeId), { occupant: "", order: "" }));
  }
}
