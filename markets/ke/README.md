# Kenya (KE)

**Status:** ✅ LIVE  
**Visible %:** 77.5%  
**Listings:** 151  
**Sources:** 3 active

## Sources

| ID | Name | Status | Method | Notes |
|----|------|--------|--------|-------|
| `ke_buyrentkenya` | BuyRentKenya | IN | headless | React/Livewire, data attributes |
| `ke_property24` | Property24 Kenya | IN | headless | P24 chain, rate-limited |
| `ke_propertycentre` | Kenya Property Centre | IN | http | Server-rendered, schema.org |

## Known Issues

- **Rate limiting:** Property24 needs 5s delays
- **Amenities:** 0% coverage
- **SPA challenges:** BuyRentKenya needs JS rendering

## Location Mapping

Uses **regions** structure (`locations.yml`):
- Nairobi → Nairobi CBD (default), Westlands, Karen
- Mombasa → Mombasa (default), Diani
- Kisumu

## Quality Metrics

- Description: **89%**
- Images (≥3): **77%**
- Bedrooms: **68%**
- Bathrooms: **66%**

## Notes

- **100% visible** on BuyRentKenya and Kenya Property Centre
- Property24 lowers average due to rate limiting issues

## Next Steps

- [ ] Add more sources (Jiji, PigiaMe)
- [ ] Reduce Property24 delays if possible
- [ ] Expand amenity keywords
