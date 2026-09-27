# Free-to-Use Polar Imagery Sources for Hackathon Demo

## Public Domain Sources (No Attribution Required)

### 1. NASA Image Library
- **URL**: https://images.nasa.gov/
- **Search Terms**: "Antarctic", "Arctic", "ice", "polar", "research station"
- **License**: Public domain (US government works)
- **Usage**: Free for any purpose, no attribution required
- **Quality**: High-resolution professional imagery
- **Examples**: Satellite images, astronaut photos, research facilities

### 2. NOAA Photo Library
- **URL**: https://www.photolib.noaa.gov/
- **Collections**: "Arctic", "Antarctic", "Ocean", "Research"
- **License**: Public domain (US government works)
- **Usage**: Free for any purpose
- **Quality**: Professional scientific photography
- **Examples**: Icebreakers, research vessels, wildlife, fieldwork

### 3. USGS Earth Resources Observation and Science (EROS)
- **URL**: https://eros.usgs.gov/
- **Search**: Landsat imagery of polar regions
- **License**: Public domain
- **Usage**: Free for any purpose
- **Quality**: Satellite imagery

## Creative Commons Sources (Attribution Required)

### 4. Wikimedia Commons
- **URL**: https://commons.wikimedia.org/
- **Search**: "Antarctica", "Arctic", "research station"
- **License Filter**: Only use images marked:
  - "Public domain"
  - "CC0" (Creative Commons Zero - no attribution required)
  - "CC-BY" (attribution only, no commercial restrictions)
- **Check**: Always verify license on individual image page
- **Usage**: For CC-BY, include photographer_credit field
- **Examples**: Station photos, wildlife, landscapes

### 5. Unsplash (Selective Use)
- **URL**: https://unsplash.com/
- **Search**: "Antarctic", "Arctic", "ice", "snow"
- **License**: Unsplash License (free for commercial use, attribution appreciated)
- **Usage**: Generally acceptable for hackathon demos
- **Note**: Verify individual image licenses
- **Quality**: High-quality artistic photography

## Specific Polar Research Sources

### 6. British Antarctic Survey (BAS) Images
- **URL**: https://www.bas.ac.uk/media/image-library/
- **License**: Varies - check each image
- **Usage**: Many are CC-BY or for educational use
- **Quality**: Authentic Antarctic research imagery

### 7. Alfred Wegener Institute (AWI) Media
- **URL**: https://www.awi.de/en/about-us/service/press-and-media.html
- **License**: Generally free for press/educational use
- **Usage**: Check specific image usage terms
- **Quality**: German polar research imagery

### 8. Australian Antarctic Division
- **URL**: https://www.antarctica.gov.au/media/
- **License**: Generally CC-BY or educational use
- **Usage**: Check individual image permissions
- **Quality**: Authentic Antarctic program imagery

## Search Strategies for Finding Images

### NASA Image Library Search Tips:
1. Go to https://images.nasa.gov/
2. Search: "Antarctic research station"
3. Filter by "Most Recent" for contemporary images
4. Download high-resolution versions
5. Save URL and NASA credit information

### NOAA Photo Library Search Tips:
1. Go to https://www.photolib.noaa.gov/
2. Browse collections: "Arctic", "Ocean", "Research"
3. Look for: icebreakers, research vessels, fieldwork
4. Download and save photographer information

### Wikimedia Commons Advanced Search:
1. Go to https://commons.wikimedia.org/wiki/Special:Search
2. Search: "Antarctic research station"
3. Scroll to "License filter"
4. Select: "Public domain" OR "CC0" OR "CC-BY"
5. Verify license on individual image page
6. Copy attribution information

## Image Metadata Template

For each downloaded image, create an entry in `media_metadata.csv`:

```csv
filename,title,description,media_type,capture_date,location_description,latitude,longitude,photographer_credit,source_url,license,expedition_code_link
antarctic_research_station.jpg,"Bharati Research Station, Antarctica","Research facility operated by India in East Antarctica",photo,2024-01-15,"Bharati Station, Larsemann Hills",-69.4,76.9,"NASA Goddard Space Flight Center",https://images.nasa.gov/details-xxxx,Public Domain,IAE-42
arctic_icebreaker.jpg,"Icebreaker in Arctic Waters","Research vessel navigating through sea ice in the Arctic Ocean",photo,2023-07-20,"Arctic Ocean, 80°N 10°E",80.0,10.0,"NOAA Photo Library",https://www.photolib.noaa.gov/item/xxxx,Public Domain,IAR-13
penguin_colony.jpg,"Gentoo Penguin Colony","Wildlife photography of penguin colony in Antarctic Peninsula",photo,2024-02-10,"Antarctic Peninsula",-64.8,-62.9,"Wikimedia Commons - CC-BY User:PhotographerName",https://commons.wikimedia.org/wiki/File:xxxx,CC-BY,IAE-42
```

## Download and Organization

```bash
# Create media directories
mkdir -p real_data/media/photos
mkdir -p real_data/media/videos

# Download sample images (replace with actual URLs)
# Example:
# curl -o real_data/media/photos/antarctic_station.jpg "https://images.nasa.gov/details-..."
```

## License Compliance Checklist

For each image:
- [ ] License verified (Public Domain, CC0, or CC-BY)
- [ ] Attribution requirements noted
- [ ] Commercial use allowed (for hackathon demo)
- [ ] Photographer/source information saved
- [ ] No watermarks or logos that violate terms
- [ ] Image quality suitable for demo

## Important Reminders

1. **NEVER use**: Copyrighted news images, stock photos without license, images with unclear terms
2. **ALWAYS verify**: License on source page, not just assumption
3. **KEEP attribution**: For CC-BY images, photographer_credit is mandatory
4. **CHECK quality**: High enough resolution for web display
5. **BE conservative**: When in doubt, choose a different image

## Sample Image Descriptions for Demo

For your hackathon demo, focus on these image types:
- Research stations (Bharati, Maitri, Himadri)
- Research vessels/icebreakers
- Ice landscapes (glaciers, ice shelves, sea ice)
- Wildlife (penguins, seals, polar bears - Arctic only)
- Fieldwork/scientific equipment
- Aerial/satellite views

This variety will showcase different media types in your demo while staying within proper licensing.
