// Détoure le sujet d'une photo avec Vision (le « copier le sujet » de
// macOS 14+) et l'écrit en PNG transparent, recadré au sujet.
//   swiftc -O detourer.swift -o .detourer && ./.detourer entree.jpg sortie.png
import CoreImage
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count == 3 else {
  print("usage: detourer <entrée> <sortie.png>")
  exit(64)
}
guard let image = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else {
  print("illisible : \(args[1])")
  exit(1)
}
let requete = VNGenerateForegroundInstanceMaskRequest()
let gestion = VNImageRequestHandler(ciImage: image, options: [:])
do {
  try gestion.perform([requete])
  guard let resultat = requete.results?.first else {
    print("aucun sujet : \(args[1])")
    exit(2)
  }
  let tampon = try resultat.generateMaskedImage(
    ofInstances: resultat.allInstances, from: gestion, croppedToInstancesExtent: true)
  let detoure = CIImage(cvPixelBuffer: tampon)
  try CIContext().writePNGRepresentation(
    of: detoure, to: URL(fileURLWithPath: args[2]), format: .RGBA8,
    colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
  print("ok \(Int(detoure.extent.width))×\(Int(detoure.extent.height)) \(resultat.allInstances.count) sujet(s)")
} catch {
  print("échec : \(error)")
  exit(3)
}
