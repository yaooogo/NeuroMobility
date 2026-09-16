
import Config from "./Util/Config.js";
import parseLog from "./cron/parseLog.js";

const DEFAULT_RETRY_DELAY_SECONDS = 5;

function positiveInt(value, defaultValue) {
    const parsedValue = Number.parseInt(String(value ?? "").trim(), 10);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : defaultValue;
}

function nonNegativeInt(value, defaultValue) {
    const parsedValue = Number.parseInt(String(value ?? "").trim(), 10);
    return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : defaultValue;
}

function getJobName(job, workerNo = 0) {
    return `${job.name || "unknown"}#${workerNo}`;
}

function formatError(error) {
    if (error instanceof Error) {
        return error.stack || error.message;
    }

    return error;
}

process.on("unhandledRejection", (reason) => {
    console.error("[Cron] unhandled rejection:", formatError(reason));
});

process.on("uncaughtException", (error) => {
    console.error("[Cron] uncaught exception:", formatError(error));
});

var jobs = [
   { "name": "parseLog.parseLogs", "callback": async () => parseLog.parseLogs(), "timeout": 3, "count": 1 },
   { "name": "parseLog.repair", "callback": async () => parseLog.repair(), "timeout": 10, "count": 1 },
];

for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i];
    console.log(`[Cron] start job=${job.name || "unknown"} timeout=${job.timeout} count=${job.count || 1}`);
    let count = job.count ? job.count : 1;
    for (var j = 0; j < count; j++) {
        scheduleCron(job, j, 0);
    }
}

function scheduleCron(job, workerNo = 0, delaySeconds = job.timeout) {
    const delayMs = nonNegativeInt(delaySeconds, DEFAULT_RETRY_DELAY_SECONDS) * 1000;

    try {
        setTimeout(() => {
            runCron(job, workerNo).catch((error) => {
                console.error(`[Cron] runner failed job=${getJobName(job, workerNo)}:`, formatError(error));
                scheduleCron(job, workerNo, DEFAULT_RETRY_DELAY_SECONDS);
            });
        }, delayMs);
    } catch (error) {
        console.error(`[Cron] schedule failed job=${getJobName(job, workerNo)}:`, formatError(error));
        setTimeout(() => scheduleCron(job, workerNo, DEFAULT_RETRY_DELAY_SECONDS), DEFAULT_RETRY_DELAY_SECONDS * 1000);
    }
}

async function runCron(job, workerNo = 0) {
    const jobName = getJobName(job, workerNo);

    try {
        if (typeof job.callback !== "function") {
            throw new Error("job callback is not a function");
        }

        await job.callback(workerNo);
    } catch (error) {
        console.error(`[Cron] job failed job=${jobName}:`, formatError(error));
    } finally {
        scheduleCron(job, workerNo, job.timeout);
    }
}
