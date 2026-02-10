# Nigeria (NG)

**Status:** ✅ LIVE  
**Visible %:** 100%  
**Listings:** 50  
**Sources:** 2 configured (1 tested)

## Sources

| ID | Name | Status | Method | Notes |
|----|------|--------|--------|-------|
| `ng_propertycentre` | Nigeria Property Centre | IN | headless | 93k+ listings, needs headless |
| `ng_propertypro` | PropertyPro Nigeria | IN | headless | 42k+ listings, Cloudflare |

## Known Issues

- **Cloudflare:** Both sources need headless
- **Rate limiting:** Long delays needed (5s+)
- **Amenities:** 0% coverage

## Location Mapping

Uses **regions** structure (`locations.yml`):
- Lagos → Lagos Island, Victoria Island, Lekki
- Abuja → Central Area, Maitama, Asokoro
- Port Harcourt

## Quality Metrics

- Description: **100%** (perfect)
- Images (≥3): **100%** (perfect)
- Bedrooms: **98%** (excellent)
- Bathrooms: **94%** (excellent)

## Notes

- **Perfect quality** on Nigeria Property Centre
- Largest market by potential listings (93k+)

## Next Steps

- [ ] Expand coverage (more sources)
- [ ] Test PropertyPro fully
- [ ] Add Jiji, Jumia House
- [ ] Implement external acquisition for Cloudflare
