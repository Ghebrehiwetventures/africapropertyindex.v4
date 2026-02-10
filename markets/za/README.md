# South Africa (ZA)

**Status:** 🚧 IN PROGRESS  
**Visible %:** TBD  
**Listings:** TBD  
**Sources:** 1 configured

## Sources

| ID | Name | Status | Method | Notes |
|----|------|--------|--------|-------|
| `za_privateproperty` | Private Property | IN | http | Server-rendered, clean markup |

## Known Issues

- Not yet tested in production
- Detail extraction disabled (needs config)

## Location Mapping

Uses **provinces + metros** structure (`locations.yml`):
- Western Cape → Cape Town
- Gauteng → Johannesburg, Pretoria
- KwaZulu-Natal → Durban

## Notes

- Largest market by potential (400k+ listings)
- Requires careful rate limiting
- Multiple major portals available (Property24, Gumtree, OLX)

## Next Steps

- [ ] First production run
- [ ] Enable detail extraction
- [ ] Add Property24 ZA
- [ ] Add location pattern validation
- [ ] Consider external acquisition for scale
