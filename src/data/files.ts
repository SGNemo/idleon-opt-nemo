// File lists shared by the node loader (tests, scripts) and the app loader.
export const DATA_PARTS = ['meta', 'minehead', 'sneaking', 'hole', 'sushi', 'spelunking', 'achievements', 'jelly', 'menagerie'] as const;

/** Rule files under data/rules/. The node loader reads the whole directory; the app needs this list. */
export const RULE_FILES = ['minehead', 'hole', 'sneaking', 'endgame', 'jelly', 'menagerie', 'dailies', 'sushi', 'spelunking'] as const;
