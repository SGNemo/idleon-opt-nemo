import { Account } from '../../model/account';
import { GameData } from '../../../data/schemas';
import { Facts } from '../types';

/** A fact provider adds facts for one system. Put each system in its own file here and register it below. */
export type FactProvider = (account: Account, data: GameData, facts: Facts) => Facts;

import { sushiProvider } from './sushi';
import { spelunkingProvider } from './spelunking';

export const FACT_PROVIDERS: FactProvider[] = [sushiProvider, spelunkingProvider];
