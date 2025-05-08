export interface SupplementalMetadataModel {
  title: string
  description: string
  imageViews: string
  creationTime: CreationTime
  photoTakenTime: PhotoTakenTime
  geoData: GeoData
  geoDataExif: GeoDataExif
  url: string
  googlePhotosOrigin: GooglePhotosOrigin
}


export const getTimestamp = (value: SupplementalMetadataModel) =>
  Number(value.photoTakenTime.timestamp);

export interface CreationTime {
  timestamp: string
  formatted: string
}

export interface PhotoTakenTime {
  timestamp: string
  formatted: string
}

export interface GeoData {
  latitude: number
  longitude: number
  altitude: number
  latitudeSpan: number
  longitudeSpan: number
}

export interface GeoDataExif {
  latitude: number
  longitude: number
  altitude: number
  latitudeSpan: number
  longitudeSpan: number
}

export interface GooglePhotosOrigin {
  driveDesktopUploader: DriveDesktopUploader
}

export interface DriveDesktopUploader {
  version: string
}
