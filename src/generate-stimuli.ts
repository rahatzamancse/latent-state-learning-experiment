/**
 * Creates an image in a canvas with the connector image in the center and the feature images around it in a circular shape.
 * @param connectorPath The path to the image that will be placed in the center of the canvas towards each features. Relative to the root of the project.
 * @param featurePaths The paths to the images that will be placed around the connector image. Relative to the root of the project.
 * @param radius Radius of the circle where the features will be placed.
 * @param canvasWidth Width of the canvas.
 * @param canvasHeight Height of the canvas.
 * @returns Data URL of the generated image.
 */
export async function generateCircularStimuli(connectorPath: string, featurePaths: string[], radius: number = 200, canvasWidth: number = 500, canvasHeight: number = 500, featureSize: number = 100): Promise<string> {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Could not create canvas context');
    }
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const center = { x: canvas.width / 2, y: canvas.height / 2 };

    const loadImage = (path: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = path;
            image.onload = () => resolve(image);
            image.onerror = reject;
        });
    };
    const images = await Promise.all([connectorPath, ...featurePaths].map(loadImage));

    // context.drawImage(images[0], center.x - images[0].width / 2, center.y - images[0].height / 2);
    
    images.slice(1).forEach((image, i) => {
        const angle = (i / (images.length - 1)) * Math.PI * 2;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        context.moveTo(center.x, center.y);
        context.lineTo(x, y);
        context.stroke();
        context.drawImage(
            image,
            x - featureSize / 2,
            y - featureSize / 2,
            featureSize,
            featureSize
        );
    });

    return canvas.toDataURL();
}