# Real Data Setup Guide for NCPOR Portal

## Overview

This guide helps you populate the NCPOR Polar Science Outreach Portal with REAL, publicly available data instead of dummy placeholders. This makes your hackathon demo look authentic and professional.

## Quick Start

### 1. Prepare Your Real Data

**Download Real Datasets:**
```bash
# Create directories
mkdir -p real_data/datasets
mkdir -p real_data/reports
mkdir -p real_data/media/photos

# Download open datasets (example URLs)
cd real_data/datasets
curl -o arctic_sea_ice.csv https://noaa-ice.s3.amazonaws.com/Sea_Ice_Index/Arctic_monthly.csv
curl -o antarctic_sea_ice.csv https://noaa-ice.s3.amazonaws.com/Sea_Ice_Index/Antarctic_monthly.csv
```

**Download Free-to-Use Images:**
- Visit https://images.nasa.gov/ and search for "Antarctic", "Arctic", "research station"
- Download high-resolution images
- Save to `real_data/media/photos/`

### 2. Fill in the Templates

**Expeditions:** Edit `real_data/expeditions_template.csv`
- Already filled with realistic expedition data
- Adjust dates/names if you have more accurate information

**Publications:** Edit `real_data/publications_template.csv`
- Already filled with realistic publication metadata
- Adjust if you have specific papers you want to feature

**Datasets:** Create `real_data/datasets_metadata.csv`
```csv
filename,title,description,data_type,file_format,parameters_measured,collection_start_date,collection_end_date,spatial_coverage,license_type,expedition_code_link
arctic_sea_ice.csv,"Arctic Sea Ice Monthly Extent","Monthly sea ice extent and area measurements for the Arctic Ocean from NOAA Sea Ice Index",oceanographic,csv,"sea ice extent,sea ice area,month,year",1979-01-01,2024-12-31,Arctic Ocean,open,IAE-42
```

**Media:** Create `real_data/media_metadata.csv`
```csv
filename,title,description,media_type,capture_date,location_description,latitude,longitude,photographer_credit,source_url,license,expedition_code_link
antarctic_station.jpg,"Bharati Research Station","Research facility operated by India in East Antarctica",photo,2024-01-15,"Bharati Station, Larsemann Hills",-69.4,76.9,"NASA Goddard Space Flight Center",https://images.nasa.gov/details-xxxx,Public Domain,IAE-42
```

### 3. Create Synthetic Reports (Optional)

If you want expedition reports, create realistic PDFs based on `real_data/EXPEDITION_REPORTS_GUIDANCE.md`. The guide provides:
- NCPOR report structure template
- Sample content for IAE-42
- Writing guidelines for authenticity
- PDF creation instructions

Save reports as: `real_data/reports/IAE-42_report_final.pdf`

### 4. Run the Real Data Seeding Script

```bash
# Make sure backend is running
python -m uvicorn app.main:app --reload

# In another terminal, run the seeding script
python seed_real_data.py
```

The script will:
- ✓ Create required directories
- ✓ Seed expeditions from CSV
- ✓ Seed publications from CSV
- ✓ Seed datasets from real files
- ✓ Seed media from real images
- ✓ Seed reports from PDFs (if available)
- ✓ Generate thumbnails for images
- ✓ Extract text from PDFs
- ✓ Validate all data before insertion
- ✓ Skip duplicates (idempotent)

### 5. Run Integration Tests

```bash
# Test the complete system
python test_full_flow.py
```

This will verify:
- ✓ API health
- ✓ Real expeditions are present
- ✓ Expedition details show related content
- ✓ Dataset preview works with real data
- ✓ Files are served correctly
- ✓ AI generation uses real source material
- ✓ Publishing workflow works
- ✓ Public endpoint filters correctly

## File Structure

```
real_data/
├── expeditions_template.csv          # Expedition metadata
├── publications_template.csv         # Publication metadata
├── datasets_metadata.csv             # Dataset file mapping
├── media_metadata.csv                # Media file mapping
├── datasets/                        # Downloaded CSV/NetCDF files
│   ├── arctic_sea_ice.csv
│   └── antarctic_sea_ice.csv
├── reports/                         # Created PDF reports
│   └── IAE-42_report_final.pdf
└── media/                           # Downloaded images
    ├── photos/
    │   ├── antarctic_station.jpg
    │   └── arctic_icebreaker.jpg
    └── thumbnails/                  # Auto-generated
```

## Data Sources

### Recommended Open Datasets

1. **NOAA Sea Ice Index** - Arctic/Antarctic sea ice data
   - https://noaa-ice.s3.amazonaws.com/Sea_Ice_Index/Arctic_monthly.csv
   - Public domain, small files, easy to use

2. **NASA GISS Temperature Data** - Global temperature anomalies
   - https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv
   - Public domain, includes polar regions

3. **NSIDC Antarctic Data** - Ice thickness, snow cover
   - https://nsidc.org/data/ - browse open datasets
   - Public domain, various formats

### Recommended Image Sources

1. **NASA Image Library** - Public domain, no attribution required
   - https://images.nasa.gov/ - search "Antarctic", "Arctic", "research station"

2. **NOAA Photo Library** - Public domain polar images
   - https://www.photolib.noaa.gov/ - browse "Arctic", "Antarctic"

3. **Wikimedia Commons** - CC-BY or public domain images
   - https://commons.wikimedia.org/ - filter by license
   - Attribution required for CC-BY

## Important Notes

### License Compliance
- **ALWAYS** verify image licenses before use
- **NEVER** use copyrighted news images or stock photos
- **KEEP** attribution information for CC-BY content
- **USE** public domain sources when possible (NASA, NOAA)

### Data Quality
- Choose small datasets (<1MB) for demo performance
- Ensure PDFs have selectable text (not scanned images)
- Test dataset preview functionality before demo
- Verify all media files display correctly

### Authenticity
- Use real expedition names, dates, locations
- Reference actual NCPOR research stations (Bharati, Maitri, Himadri)
- Include realistic scientific measurements
- Match NCPOR's actual research focus areas

## Troubleshooting

### "File not found" errors
- Ensure files are in correct directories
- Check filenames match exactly in metadata CSVs
- Verify file permissions

### "License validation failed"
- Check image licenses on source websites
- Ensure attribution information is complete
- Use different images if uncertain

### "AI generation not working"
- Verify Groq API key is set in .env
- Check that expeditions have related content
- Ensure PDF text extraction worked
- Run test_generator.py for debugging

### "Dataset preview empty"
- Verify CSV files have proper headers
- Check file encoding (should be UTF-8)
- Ensure datasets_metadata.csv is correct
- Test with known-good CSV file

## Demo Preparation Checklist

Before your hackathon demo:

- [ ] Backend running on http://localhost:8000
- [ ] Real data seeded successfully
- [ ] All integration tests passing
- [ ] AI generation tested with real expedition
- [ ] At least 2 expeditions with related content
- [ ] At least 1 downloadable dataset
- [ ] At least 3 images with proper attribution
- [ ] At least 1 publication with real metadata
- [ ] Public website shows published content
- [ ] File serving works for all content types

## Emergency Fallback

If real data collection takes too long:

1. **Use the provided templates** - They already contain realistic data
2. **Download 2-3 NASA images** - Quick and public domain
3. **Download 1 NOAA dataset** - Sea ice data is small and easy
4. **Skip expedition reports** - Publications provide text for AI generation
5. **Run integration tests** - Ensures system works even with minimal data

The system is designed to work gracefully with partial data, so you can always add more real data later if needed.

## Support

For issues with:
- **Data sources**: Check the DATASET_SOURCES.md and MEDIA_SOURCES.md guides
- **Seeding script**: Review error messages carefully
- **Integration tests**: Run with verbose output for debugging
- **API endpoints**: Check backend logs and API docs at /docs

Good luck with your hackathon demo! 🚀
