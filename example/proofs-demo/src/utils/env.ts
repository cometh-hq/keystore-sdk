export const getEnv = (key: string): string => {
    const value = process.env[key]
    if (!value) {
        throw new Error(`Missing env.${key}`)
    }
    return value
}

export const findEnv = (key: string): string | undefined => {
    return process.env[key]
}