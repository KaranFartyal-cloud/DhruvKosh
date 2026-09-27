# Real Scientific Dataset Sources for NCPOR Portal

## Recommended Open Datasets for Polar Science

### 1. NOAA Sea Ice Index (CSV Format)
- **Source**: https://nsidc.org/data/seaice_index
- **Description**: Monthly sea ice extent and concentration data for Arctic and Antarctic
- **Format**: CSV files available for download
- **Size**: Small (~100KB per file)
- **License**: Public domain (US government data)
- **Fields**: Year, Month, Extent, Area, Rank, etc.
- **Download**: Direct CSV download links available

### 2. NASA GISS Surface Temperature Analysis
- **Source**: https://data.giss.nasa.gov/gistemp/
- **Description**: Global temperature anomaly data including polar regions
- **Format**: CSV and NetCDF available
- **Size**: Small (~500KB)
- **License**: Public domain (NASA data)
- **Download**: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv

### 3. READER Project Weather Station Data
- **Source**: https://www.amap.no/projects/reader
- **Description**: Arctic meteorological data from research stations
- **Format**: CSV available for several stations
- **License**: Open access for research
- **Note**: May require registration for full access

### 4. SCAR Antarctic Biodiversity Database
- **Source**: https://biodiversity.aq/
- **Description**: Species occurrence data from Antarctic research
- **Format**: CSV exports available
- **License**: CC-BY for most datasets
- **Size**: Variable, can filter by region/species

### 5. NSIDC Antarctic Ice Thickness Data
- **Source**: https://nsidc.org/data/icebridge
- **Description**: Ice thickness measurements from airborne campaigns
- **Format**: NetCDF and CSV subsets available
- **License**: Public domain (NASA/NSIDC data)
- **Size**: Can be large, but CSV subsets available

### 6. Copernicus Climate Data Store (CDS)
- **Source**: https://cds.climate.copernicus.eu/
- **Description**: European climate data including Arctic/Antarctic
- **Format**: NetCDF, GRIB, CSV subsets
- **License**: Free for research use
- **Note**: Requires free registration

### 7. World Ocean Database (WOD)
- **Source**: https://www.ncei.noaa.gov/products/world-ocean-database
- **Description**: Global ocean temperature/salinity profiles
- **Format**: NetCDF with CSV export capability
- **License**: Public domain (NOAA data)
- **Size**: Large, but can filter by region

### 8. Antarctic Digital Magnetic Anomaly Project (ADMAP)
- **Source**: https://www.admapmap.org/
- **Description**: Magnetic anomaly data for Antarctica
- **Format**: Grid data and CSV point data
- **License**: Open access for research
- **Size**: Medium

## Recommended Datasets for Demo (Small, Easy to Use)

### For Demo Purposes, Download These:

1. **NOAA Sea Ice Index - Arctic Monthly Data**
   - URL: https://noaa-ice.s3.amazonaws.com/Sea_Ice_Index/Arctic_monthly.csv
   - Size: ~15KB
   - Columns: Year, Month, Extent, Area, etc.

2. **NOAA Sea Ice Index - Antarctic Monthly Data**
   - URL: https://noaa-ice.s3.amazonaws.com/Sea_Ice_Index/Antarctic_monthly.csv
   - Size: ~15KB
   - Columns: Year, Month, Extent, Area, etc.

3. **NASA GISS Temperature Data (Last 10 years)**
   - URL: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv
   - Size: ~10KB
   - Focus on recent years for demo relevance

## Download Instructions

```bash
# Create datasets directory
mkdir -p real_data/datasets

# Download sea ice data
curl -o real_data/datasets/arctic_sea_ice.csv https://noaa-ice.s3.amazonaws.com/Sea_Ice_Index/Arctic_monthly.csv
curl -o real_data/datasets/antarctic_sea_ice.csv https://noaa-ice.s3.amazonaws.com/Sea_Ice_Index/Antarctic_monthly.csv

# Download temperature data
curl -o real_data/datasets/global_temperature.csv https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv
```

## Dataset Metadata Template

For each downloaded dataset, create a corresponding entry in `datasets_metadata.csv`:

```csv
filename,title,description,data_type,file_format,parameters_measured,collection_start_date,collection_end_date,spatial_coverage,license_type,expedition_code_link
arctic_sea_ice.csv,"Arctic Sea Ice Monthly Extent","Monthly sea ice extent and area measurements for the Arctic Ocean from NOAA Sea Ice Index",oceanographic,csv,"sea ice extent,sea ice area,month,year",1979-01-01,2024-12-31,Arctic Ocean,open,IAE-42
antarctic_sea_ice.csv,"Antarctic Sea Ice Monthly Extent","Monthly sea ice extent and area measurements for the Southern Ocean from NOAA Sea Ice Index",oceanographic,csv,"sea ice extent,sea ice area,month,year",1979-01-01,2024-12-31,Southern Ocean,open,IAE-42
global_temperature.csv,"Global Surface Temperature Anomalies","Monthly global temperature anomaly data from NASA GISS, including polar regions",atmospheric,csv,"temperature anomaly,month,year",1880-01-01,2024-12-31,Global including polar regions,open,IAR-13
```

## Important Notes

1. **File Size**: Choose small datasets (<1MB) for quick demo performance
2. **License**: All recommended sources are public domain or open access
3. **Attribution**: Keep source information in description fields
4. **Relevance**: Choose datasets that match expedition themes (sea ice for Antarctic, temperature for Arctic, etc.)
5. **Data Quality**: Use official institutional sources (NOAA, NASA, NSIDC) rather than unknown sources
