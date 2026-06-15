



document.getElementById("runOCR")
.addEventListener("click", async () => {

    const file =
        document.getElementById("imageInput").files[0];

    if (!file) {
        alert("Please upload an image first");
        return;
    }

    
    
    
    const result =
        await Tesseract.recognize(
            file,
            "eng",
            {
                logger: m => console.log(m)
            }
        );

    const text =
        result.data.text;

    console.log("RAW OCR TEXT:", text);

    
    
    
    const parsed =
        parseOCR(text);

    console.log("PARSED DATA:", parsed);

    if (parsed.length === 0) {
        alert("No valid rows detected. Check format.");
        return;
    }

    
    
    
    localStorage.setItem(
        "ocrParsed",
        JSON.stringify(parsed)
    );

    
    
    
    window.location.href = "ocr-import.html";

});




function parseOCR(text) {

    const lines =
        text.split("\n")
            .map(l => l.trim())
            .filter(Boolean);

    const results = [];

    lines.forEach(line => {

        
        if (line.length < 5) return;

        const parts =
            line.split(/\s+/); 

        if (parts.length < 3) return;

        
        let percentRaw =
            parts[parts.length - 1];

        let rewards =
            parseInt(parts[parts.length - 2]);

        let transactions =
            parseInt(parts[parts.length - 3]);

        let name =
            parts.slice(0, parts.length - 3)
                .join(" ");

        
        let percent =
            parseFloat(
                percentRaw.replace("%", "")
            );

        
        if (
            !name ||
            isNaN(transactions) ||
            isNaN(rewards)
        ) {
            return;
        }

        results.push({
            name: name.trim(),
            transactions,
            rewards,
            percent: isNaN(percent) ? 0 : percent
        });

    });

    return results;
}