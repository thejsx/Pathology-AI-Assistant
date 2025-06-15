from model_factory.modeling_convnext import CT_SINGLE

model = CT_SINGLE('convnext_tiny')
model_path = 'C:\\Users\\jrsch\\Documents\\Visual Studio Code\\Pathology AI assistant\\convnext-tiny_pathology.pth'
def load_model(checkpoint_path, model):
    checkpoint = torch.load(checkpoint_path, map_location='cpu')
    model.load_state_dict(checkpoint['model'])
    print("Resume checkpoint %s" % checkpoint_path)

load_model(model_path, model)

def default_loader(path):
    img = Image.open(path)
    return img.convert('RGB')

transform_val_global = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])])