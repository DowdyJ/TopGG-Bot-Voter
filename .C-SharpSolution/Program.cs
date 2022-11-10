using PuppeteerSharp;

namespace TopGGVoter;

public class Program 
{
    public static async Task Main(String[] args)
    {
        // 251239170058616833 kotoba
        // 646937666251915264 karuta
        String botID = "877436488344805426";
        String url = $@"https://top.gg/bot/{botID}/vote";
        String email = args[0];
        String password = args[1];

        using BrowserFetcher browserFetcher = new BrowserFetcher();
        await browserFetcher.DownloadAsync(BrowserFetcher.DefaultChromiumRevision);
        var browser = await Puppeteer.LaunchAsync(new LaunchOptions
        {
            Headless = false,
            Timeout = 300000
        });
        
        try
        {
            using IPage page = await browser.NewPageAsync();
            page.DefaultTimeout = 0;
            
            await Task.WhenAny(page.GoToAsync(url, 0, null), Utilities.DelayAbout(6, 1));        


            if (!await Utilities.ClickElementOfTypeWithInnerText(page, "a", "Login to vote"))
            {
                Console.WriteLine("Failed to click login button on Top.gg");
                return;
            }
            await Utilities.DelayAbout(7, 1);

            if (!await Utilities.TypeInInputFieldWithSelector(page, email, "input[name='email']", new Utilities.Pair<float, float>(0.1f, 0.05f)))
            {
                Console.WriteLine("Failed to input username/email");
                return;
            }
            await Utilities.DelayAbout(1, 1);

            if (!await Utilities.TypeInInputFieldWithSelector(page, password, "input[name='password']", new Utilities.Pair<float, float>(0.1f, 0.05f)))
            {
                Console.WriteLine("Failed to input password");
                return;
            }
            await Utilities.DelayAbout(1, 1);

            if (!await Utilities.ClickElementWithSelector(page, "button[type='submit']")) 
            {
                Console.WriteLine("Couldn't click submit button, aborting,");
                return;
            }
            await Utilities.DelayAbout(5, 1);

            if (!await Utilities.ClickElementOfTypeWithInnerText(page, "button", "Authorize"))
            {
                Console.WriteLine("Failed to click authorize button on discord");
                return;
            }
            await Utilities.DelayAbout(6, 1);
            await page.ReloadAsync(0);
            await Utilities.DelayAbout(8, 1);

            if (!await Utilities.ClickElementOfTypeWithInnerText(page, "button", "Vote"))
            {
                Console.WriteLine("Failed to click vote button on top.gg");
                return;
            }

            await Utilities.DelayAbout(30, 0);

        } 
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
        } 
        finally 
        {
            await browser.CloseAsync();
        }


        return;
    }
}