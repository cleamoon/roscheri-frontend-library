import glob from "fast-glob";
import path from "path";

export function getRoutes(dirname: string = "../site/page"): { path: string, component: any }[] {
    const tsFiles = glob.sync("./**/*.ts", { cwd: dirname })
    const mdFiles = glob.sync("./**/*.md", { cwd: dirname })

    const tsRoutes = tsFiles.map(file => {
        const routePath = "/" + file.replace(/\.ts$/, "").replace(/index$/, "").replace(/\\/g, "/").replace(/\/$/, "")
        const component = require(path.join(dirname, file)).default
        return { path: routePath, component }
    })
    
    const mdRoutes = mdFiles.map(file => {
        const routePath = "/" + file.replace(/\.md$/, "").replace(/index$/, "").replace(/\\/g, "/").replace(/\/$/, "")
        const component = require('./markdown').markdownComponent(path.join(dirname, file))
        return { path: routePath, component }
    })

    return [...tsRoutes, ...mdRoutes]
}
