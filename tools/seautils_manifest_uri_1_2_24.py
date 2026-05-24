import json
import re
from pathlib import Path

version = '1.2.24'
manifest_uri = 'https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/plugins/SeaUtils-Kolex06-Version.json'
provider_path = Path('plugins/SeaUtilsKolex06Version/provider.ts')
manifest_path = Path('plugins/SeaUtils-Kolex06-Version.json')
marketplace_path = Path('marketplace.json')
readme_path = Path('README.md')

provider = provider_path.read_text(encoding='utf-8').replace('\r\n', '\n').rstrip()

if "const marketplaceEnhancementVersion = 'v10';" not in provider:
    raise SystemExit('SeaUtils runtime hotfix is missing')
if "async function hasDocumentationForCard(card) {\n                        try {" not in provider:
    raise SystemExit('SeaUtils documentation check is not fail-safe')
if "async function hasPreferencesForCard(card) {\n                        try {" not in provider:
    raise SystemExit('SeaUtils preferences check is not fail-safe')

manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['version'] = version
manifest['manifestURI'] = manifest_uri
manifest['payload'] = provider
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

marketplace = json.loads(marketplace_path.read_text(encoding='utf-8'))
for item in marketplace:
    if item.get('id') == 'SeaUtils-Kolex06-Version':
        item['version'] = version
        item['manifestURI'] = manifest_uri
        break
else:
    raise SystemExit('SeaUtils marketplace entry not found')
marketplace_path.write_text(json.dumps(marketplace, indent=2) + '\n', encoding='utf-8')

readme = readme_path.read_text(encoding='utf-8')
readme = re.sub(r'(\| SeaUtils Kolex06-Version \| )[^|]+( \| `SeaUtils-Kolex06-Version` \|)', r'\g<1>' + version + r'\g<2>', readme, count=1)
readme_path.write_text(readme, encoding='utf-8')
