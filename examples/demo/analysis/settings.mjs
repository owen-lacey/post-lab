// Writes a .json that is an object, not an array of objects, so post-lab shows an error for it.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

writeFileSync(join(process.env.POST_LAB_OUT, 'settings.json'), '{ "theme": "dark" }\n');
