using PuppeteerSharp;

namespace TopGGVoter;

#nullable disable
class Program 
{
    static async Task Main(String[] args)
    {
        String botID = "646937666251915264"; //args[0]
        String loginUrl = @$"https://top.gg/login?redir=/bot/{botID}/vote";
        String password = "SCgepbkj2Nw6nZD";//args[2];
        String email = "joeldowdy12@gmail.com";//args[3];
  

        //input[name="email"]
        //name="password"
        // button[type="submit"]

        // div contents as Authorize
        // button with contents Vote
        // close

        using var browserFetcher = new BrowserFetcher();
        await browserFetcher.DownloadAsync(BrowserFetcher.DefaultChromiumRevision);
        var browser = await Puppeteer.LaunchAsync(new LaunchOptions
        {
            Headless = false,
            Timeout = 120000
        });

        var page = await browser.NewPageAsync();
        await page.SetExtraHttpHeadersAsync(new Dictionary<string, string> 
        {
        {"user-agent", "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36"},
        {"upgrade-insecure-requests", "1"},
        {"accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3"},
        {"accept-encoding", "gzip, deflate, br"},
        {"accept-language", "en-US,en;q=0.9,en;q=0.8"}
        });

        await page.GoToAsync(loginUrl);
        
        RandomTyper typer = new RandomTyper();
        await Task.Delay(2585);
        await typer.Type(email, page, "input[name='email']");
        await Task.Delay(40);
        await typer.Type(password, page, "input[name='password']");
        await ClickElement(page, "button[type='submit']");
        await Task.Delay(4694);

        await ClickFirstElementContainingInnerText(page, "div", "Authorize");
        await Task.Delay(20192);

        await ClickFirstElementContainingInnerText(page, "button", "Vote");

        await Task.Delay(4694);
        await browser.CloseAsync();

        return;
    }

    static async Task ClickElement(IPage page, String selector) 
    {
        var elements = await page.QuerySelectorAllAsync(selector);
        await Task.Delay(694);
        if (elements.Length == 0)
        {
            Console.Error.WriteLine("Couldn't element to click (or got more than one).");
            return;
        }
        await elements[0].ClickAsync();
        return;
    }

    static async Task ClickSpanButton(IPage page, String buttonText) 
    {
        var spans = await page.QuerySelectorAllAsync("span");
        foreach (var spick in spans) 
        {
            if (await page.EvaluateFunctionAsync<String>("e => e.innerText", spick) == buttonText) 
            {
                await spick.ClickAsync();
                return;
            }
        }
    }
    static async Task ClickFirstElementContainingInnerText(IPage page, String tagName, String innerText) 
    {
        var elements = await page.EvaluateExpressionAsync($"let b; let a = document.getElementsByTagName('{tagName}'); for (let i = 0; i < a.length; i++) {{ if (a[i].innerHTML == \"{innerText}\") {{b = a[i]; break; }}}}; b.click()");
        return;
    }
}
