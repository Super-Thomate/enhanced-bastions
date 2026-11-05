import BastionData, { OCCUPANT_TYPES } from "./data/bastion-data.mjs";
import BastionSheet from "./sheets/bastion-sheet.mjs";

const MODULE_ID = "enhanced-bastions";
const BASTION_TYPE = `${MODULE_ID}.bastion`;

/** Redraw open bastion sheets, which display the name and portrait of their occupants. */
function renderBastionSheets() {
  for ( const sheet of BastionSheet.instances() ) sheet.render({ parts: ["spaces"] });
}

Hooks.once("init", () => {
  CONFIG.Actor.dataModels[BASTION_TYPE] = BastionData;
  CONFIG.Actor.typeLabels[BASTION_TYPE] = "ENHANCED_BASTIONS.Actor.Bastion";
  CONFIG.Actor.typeIcons[BASTION_TYPE] = "fa-solid fa-chess-rook";
  CONFIG.DND5E.defaultArtwork.Actor[BASTION_TYPE] = "icons/svg/city.svg";

  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE_ID, BastionSheet, {
    types: [BASTION_TYPE],
    makeDefault: true,
    label: "ENHANCED_BASTIONS.Sheet.Bastion"
  });
});

Hooks.on("updateActor", (actor, changes) => {
  if ( OCCUPANT_TYPES.includes(actor.type) && (("name" in changes) || ("img" in changes)) ) renderBastionSheets();
});

Hooks.on("deleteActor", actor => {
  if ( OCCUPANT_TYPES.includes(actor.type) ) renderBastionSheets();
});
