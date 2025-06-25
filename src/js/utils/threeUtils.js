/**
 * Three.js utility functions for the Cymatic Visualizer
 */

/**
 * Creates a plane geometry with specified parameters
 * @param {number} width - Width of the plane
 * @param {number} height - Height of the plane
 * @param {number} widthSegments - Number of width segments
 * @param {number} heightSegments - Number of height segments
 * @returns {THREE.PlaneGeometry} The created plane geometry
 */
export function createPlaneGeometry(width = 6, height = 6, widthSegments = 32, heightSegments = 32) {
    return new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
}

/**
 * Creates a sphere geometry with specified parameters
 * @param {number} radius - Radius of the sphere
 * @param {number} widthSegments - Number of width segments
 * @param {number} heightSegments - Number of height segments
 * @returns {THREE.SphereGeometry} The created sphere geometry
 */
export function createSphereGeometry(radius = 0.05, widthSegments = 8, heightSegments = 6) {
    return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
}

/**
 * Creates a wireframe material with specified color and opacity
 * @param {number} color - Hex color value
 * @param {number} opacity - Opacity value (0-1)
 * @returns {THREE.MeshBasicMaterial} The created wireframe material
 */
export function createWireframeMaterial(color, opacity = 0.8) {
    return new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: opacity
    });
}

/**
 * Creates a solid material with specified color and opacity
 * @param {number} color - Hex color value
 * @param {number} opacity - Opacity value (0-1)
 * @returns {THREE.MeshBasicMaterial} The created solid material
 */
export function createSolidMaterial(color, opacity = 0.1) {
    return new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity
    });
}

/**
 * Creates a sphere material with specified color and opacity
 * @param {number} color - Hex color value
 * @param {number} opacity - Opacity value (0-1)
 * @returns {THREE.MeshBasicMaterial} The created sphere material
 */
export function createSphereMaterial(color, opacity = 0.6) {
    return new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity
    });
}

/**
 * Calculates distance from origin for a point
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {number} Distance from origin
 */
export function calculateDistance(x, y) {
    return Math.sqrt(x * x + y * y);
}

/**
 * Converts screen coordinates to normalized device coordinates
 * @param {number} clientX - Client X coordinate
 * @param {number} clientY - Client Y coordinate
 * @param {number} windowWidth - Window width
 * @param {number} windowHeight - Window height
 * @returns {Object} Normalized coordinates {x, y}
 */
export function screenToNormalized(clientX, clientY, windowWidth, windowHeight) {
    return {
        x: (clientX / windowWidth) * 2 - 1,
        y: -(clientY / windowHeight) * 2 + 1
    };
}

/**
 * Creates a plane for raycasting at a specific Z position
 * @param {number} zPosition - Z position of the plane
 * @returns {THREE.Plane} The created plane
 */
export function createRaycastPlane(zPosition) {
    return new THREE.Plane(new THREE.Vector3(0, 0, 1), -zPosition);
} 