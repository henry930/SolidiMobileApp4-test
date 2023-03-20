// Note: Need to import each image individually.
// - The function "require" can't accept a variable.
// Reason: Webpack can only bundle resources that it can identify at bundle time.

import solidi_logo_landscape_black_1924x493 from './solidi_logo_landscape_black_1924x493.png';
import trustpilot from './trustpilot.png';
import asset_icons from './asset_icons';
import maintenance from './dreamstime_xl_30079286-50percent.png';
import updaterequired from './dreamstime_xxl_98694463-cropped-rotated.png';

let { GBP, BTC, ETH } = asset_icons;


let ImageLookup = {
  solidi_logo_landscape_black_1924x493,
  trustpilot,
  maintenance,
  updaterequired,
  GBP,
  BTC,
  ETH,
  asset_icons,
}

export default ImageLookup;
